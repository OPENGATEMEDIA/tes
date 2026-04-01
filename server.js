/**
 * ╔══════════════════════════════════════════════════════╗
 *  TIKTOK FIREWORKS - SERVER v3
 *  Session cookie support · Live logs · Hot reconnect
 * ╚══════════════════════════════════════════════════════╝
 */

const http = require("http");
const fs   = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

let WebcastPushConnection;
try {
  ({ WebcastPushConnection } = require("tiktok-live-connector"));
} catch (e) {
  const mod = require("tiktok-live-connector");
  WebcastPushConnection = mod.WebcastPushConnection || mod.default || mod;
}

// ── PATHS ─────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, "config.json");
const PUBLIC_DIR  = path.join(__dirname, "public");

// ── CONFIG ────────────────────────────────────────────────
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); }
  catch { return { tiktokUsername:"", sessionId:"", httpPort:3000, wsPort:8080, likeEnabled:true, gifts:[] }; }
}
function saveConfig(d) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(d,null,2),"utf8"); }

let cfg = loadConfig();

function buildLookup() {
  const pts={}, emoji={};
  for (const g of (cfg.gifts||[])) { const k=g.name.toLowerCase(); pts[k]=g.pts; emoji[k]=g.emoji; }
  pts["default"]=1;
  return { pts, emoji };
}
let lookup = buildLookup();

const HTTP_PORT = process.env.PORT    || cfg.httpPort || 3000;
const WS_PORT   = process.env.WS_PORT || cfg.wsPort   || 8080;
const MIME = { ".html":"text/html",".js":"application/javascript",".css":"text/css",".ico":"image/x-icon",".json":"application/json" };

// ── WEBSOCKET ─────────────────────────────────────────────
// wss dideklarasikan setelah httpServer (lihat bagian bawah)
let wss;
let tiktok = null;
let tiktokStatus = { connected:false, username:"", error:"", connecting:false };
const logBuffer = [];  // keep last 100 log lines for dashboard

function broadcast(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState===1) c.send(msg); });
}

// Broadcast a log line AND show in terminal
function log(icon, msg) {
  const line = `${icon} ${msg}`;
  const entry = { t: new Date().toLocaleTimeString("id-ID"), msg: line };
  logBuffer.push(entry);
  if (logBuffer.length > 100) logBuffer.shift();
  console.log(line);
  broadcast({ type:"LOG", payload: entry });
}

// ── TIKTOK CONNECT ────────────────────────────────────────
function disconnectTikTok() {
  if (tiktok) { try { tiktok.disconnect(); } catch {} tiktok=null; }
  tiktokStatus = { connected:false, username:cfg.tiktokUsername, error:"", connecting:false };
}

function connectTikTok(username, sessionId) {
  disconnectTikTok();

  username  = (username||"").trim();
  sessionId = (sessionId||cfg.sessionId||"").trim();

  if (!username || username.replace("@","").length < 1) {
    tiktokStatus = { connected:false, username, error:"Username kosong", connecting:false };
    broadcast({ type:"STATUS", payload:tiktokStatus });
    return;
  }

  log("🔌", `Menghubungkan ke: ${username}${sessionId?" (dengan session cookie)":""}`);
  tiktokStatus = { connected:false, username, error:"", connecting:true };
  broadcast({ type:"STATUS", payload:tiktokStatus });

  // Build options — session cookie helps bypass TikTok rate limits
  const options = {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000,
    requestHeaders: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  };

  // Session ID (sessionid cookie dari browser TikTok)
  if (sessionId) {
    options.sessionId = sessionId;
    // Beberapa versi library pakai nama berbeda
    options.cookieString = `sessionid=${sessionId}`;
  }

  try {
    tiktok = new WebcastPushConnection(username, options);
  } catch(e) {
    log("❌", "Gagal inisialisasi: " + e.message);
    tiktokStatus = { connected:false, username, error:e.message, connecting:false };
    broadcast({ type:"STATUS", payload:tiktokStatus });
    return;
  }

  tiktok.connect()
    .then(state => {
      tiktokStatus = { connected:true, username, error:"", connecting:false };
      const roomId = state?.roomId || state?.room_id || "-";
      log("✅", `Terhubung! RoomID: ${roomId}`);
      broadcast({ type:"STATUS", payload:tiktokStatus });
    })
    .catch(err => {
      const msg = err.message || String(err);
      tiktokStatus = { connected:false, username, error:msg, connecting:false };

      // Diagnosa error umum
      if (msg.includes("LIVE")) {
        log("⚠️", `Akun ${username} belum/tidak sedang LIVE`);
      } else if (msg.includes("rate") || msg.includes("429") || msg.includes("blocked")) {
        log("⚠️", "Rate limited oleh TikTok — coba tambahkan Session Cookie di dashboard");
      } else if (msg.includes("404") || msg.includes("not found")) {
        log("⚠️", `Username @${username.replace("@","")} tidak ditemukan`);
      } else if (msg.includes("ENOTFOUND") || msg.includes("network")) {
        log("⚠️", "Gagal terhubung ke internet / DNS error");
      } else {
        log("❌", "Error: " + msg);
        log("💡", "Coba: 1) Pastikan akun sedang LIVE  2) Tambahkan Session Cookie di dashboard");
      }

      broadcast({ type:"STATUS", payload:tiktokStatus });
    });

  tiktok.on("connected",  ()  => log("📡", "WebSocket TikTok tersambung"));
  tiktok.on("disconnected", r => {
    tiktokStatus = { connected:false, username, error:String(r), connecting:false };
    broadcast({ type:"STATUS", payload:tiktokStatus });
    log("🔌", "Terputus: " + r);
  });
  tiktok.on("streamEnd", () => {
    tiktokStatus = { connected:false, username, error:"Stream selesai", connecting:false };
    broadcast({ type:"STATUS", payload:tiktokStatus });
    log("📴", "Stream selesai");
  });
  tiktok.on("error", err => log("⚠️", "WS Error: " + err.message));

  tiktok.on("gift", data => {
    if (data.giftType===1 && !data.repeatEnd) return;
    const user  = "@"+(data.uniqueId||"anonymous");
    const key   = (data.giftName||"gift").toLowerCase();
    const count = data.repeatCount||1;
    const pts   = (lookup.pts[key]||lookup.pts["default"])*count;
    const em    = lookup.emoji[key]||"🎁";
    log("🎁", `${user} | ${data.giftName} ×${count} = ${pts}pt`);
    broadcast({ type:"GIFT", payload:{ username:user, giftName:data.giftName||"Gift", giftEmoji:em, count, pts } });
  });

  tiktok.on("like", data => {
    if (!cfg.likeEnabled) return;
    const user = "@"+(data.uniqueId||"anonymous");
    log("❤️", `${user} like`);
    broadcast({ type:"LIKE", payload:{ username:user } });
  });

  tiktok.on("viewer_count_update", data => {
    broadcast({ type:"VIEWERS", count:data.viewerCount });
  });

  tiktok.on("chat", data => {
    log("💬", `${data.uniqueId}: ${data.comment}`);
  });
}

// ── HTTP SERVER ───────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  function json(code, data) {
    res.writeHead(code, { "Content-Type":"application/json","Access-Control-Allow-Origin":"*" });
    res.end(JSON.stringify(data));
  }
  function readBody(cb) {
    let b="";
    req.on("data", d => b+=d);
    req.on("end", () => { try { cb(JSON.parse(b)); } catch { json(400,{error:"Bad JSON"}); } });
  }

  if (req.method==="OPTIONS") {
    res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST","Access-Control-Allow-Headers":"Content-Type"});
    return res.end();
  }

  if (req.method==="GET"  && url==="/api/config")     return json(200, cfg);
  if (req.method==="GET"  && url==="/api/status")     return json(200, tiktokStatus);
  if (req.method==="GET"  && url==="/api/logs")       return json(200, logBuffer);

  if (req.method==="POST" && url==="/api/config") return readBody(body => {
    cfg = { ...cfg, ...body };
    saveConfig(cfg);
    lookup = buildLookup();
    json(200, { ok:true });
  });

  if (req.method==="POST" && url==="/api/connect") return readBody(body => {
    const u = (body.username||cfg.tiktokUsername||"").trim();
    const s = (body.sessionId||cfg.sessionId||"").trim();
    if (!u) return json(400, { error:"Username kosong" });
    cfg.tiktokUsername = u;
    if (s) cfg.sessionId = s;
    saveConfig(cfg);
    connectTikTok(u, s);
    json(200, { ok:true, username:u });
  });

  if (req.method==="POST" && url==="/api/disconnect") {
    disconnectTikTok();
    broadcast({ type:"STATUS", payload:tiktokStatus });
    log("🔌", "Disconnect manual");
    return json(200, { ok:true });
  }

  // Static
  let fp;
  if (url==="/")              fp = path.join(PUBLIC_DIR,"index.html");
  else if (url==="/dashboard") fp = path.join(PUBLIC_DIR,"dashboard.html");
  else                        fp = path.join(PUBLIC_DIR, url);

  const ext=path.extname(fp), mime=MIME[ext]||"text/plain";
  fs.readFile(fp, (err,data) => {
    if (err) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200,{"Content-Type":mime});
    res.end(data);
  });
});

// ── WEBSOCKET (pakai HTTP server yang sama) ───────────────
wss = new WebSocketServer({ server: httpServer });
wss.on("connection", ws => {
  ws.send(JSON.stringify({ type:"STATUS",   payload: tiktokStatus }));
  ws.send(JSON.stringify({ type:"LOG_BULK", payload: logBuffer }));
});

httpServer.listen(HTTP_PORT, () => {
  log("🌐", `HTTP: http://localhost:${HTTP_PORT}`);
  log("⚙️ ", `Dashboard: http://localhost:${HTTP_PORT}/dashboard`);
  log("📡", `WebSocket: ws://localhost:${HTTP_PORT} (same port)`);
});

if (cfg.tiktokUsername && cfg.tiktokUsername.replace("@","").length>0) {
  log("🔄", "Auto-connect: " + cfg.tiktokUsername);
  setTimeout(() => connectTikTok(cfg.tiktokUsername, cfg.sessionId), 1500);
}

process.on("SIGINT", () => {
  log("👋","Server dimatikan");
  disconnectTikTok(); wss.close(); httpServer.close(); process.exit(0);
});
