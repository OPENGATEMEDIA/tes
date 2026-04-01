# 🎆 TikTok Gift Fireworks

Game live streaming TikTok — setiap **like** dan **gift** dari penonton
memunculkan username yang **meluncur ke atas** lalu **meledak jadi kembang api**.
Semakin besar nilai gift, semakin spektakuler ledakannya.

---

## 🚀 Cara Deploy (5 menit)

### 1. Install Node.js
Download dari https://nodejs.org (versi 18 atau 20 LTS)

### 2. Install dependencies
```bash
npm install
```

### 3. Set username TikTok kamu
Edit file `server.js` baris 17:
```js
const TIKTOK_USERNAME = "@username_tiktok_kamu"; // ← ganti ini
```

Atau pakai environment variable:
```bash
# Windows
set TIKTOK_USER=@username_kamu && node server.js

# Mac/Linux
TIKTOK_USER=@username_kamu node server.js
```

### 4. Jalankan server
```bash
node server.js
```

Output yang benar:
```
🌐 Buka browser: http://localhost:3000
✅ WebSocket berjalan di ws://localhost:8080
🎵 Terhubung ke TikTok Live: @username_kamu
```

### 5. Buka game di browser
Buka: **http://localhost:3000**

### 6. Share screen ke TikTok Live
- Buka TikTok Live di HP
- Tap ikon **Share Screen**
- Pilih browser yang menampilkan game
- ✅ Selesai! Penonton kirim gift → langsung muncul kembang api

---

## 🎁 Tier Kembang Api

| Gift | Poin | Efek |
|------|------|------|
| ❤️ Like | 0 | Percikan putih kecil |
| 🌹 Rose dll | 1–9 | Burst merah muda |
| 🎵 TikTok dll | 10–49 | Burst cyan + ledakan sekunder |
| 🦁 Lion dll | 50–199 | Burst emas + ring + glitter |
| 🌌 Universe dll | 200–499 | Rainbow + shake layar |
| 🪐 Galaxy dll | 500+ | **LEGENDARY** — mega blast + sub-bass |

---

## ⌨️ Shortcut Keyboard (untuk test)

| Tombol | Aksi |
|--------|------|
| `G` | Paksa muncul gift Legendary (500pt) |
| `L` | Paksa muncul Like |
| 🔊 | Tombol mute/unmute di pojok kanan atas |

---

## 🔧 Konfigurasi Tambahan

### Port custom
```bash
PORT=8000 WS_PORT=9000 node server.js
```
Lalu edit `public/index.html` baris WebSocket:
```js
ws = new WebSocket('ws://localhost:9000');
```

### Tambah/ubah bobot poin gift
Edit `GIFT_POINTS` di `server.js`:
```js
const GIFT_POINTS = {
  rose: 1,
  lion: 50,
  galaxy: 500,
  // tambahkan gift lain di sini
};
```

### Mode Demo (tanpa TikTok Live)
Jika server tidak konek ke TikTok, browser otomatis masuk **mode demo** —
kembang api simulasi tetap berjalan agar tampilan tetap hidup.

---

## ❓ Troubleshooting

**"Gagal konek ke TikTok Live"**
- Pastikan akun sedang aktif **LIVE**
- Pastikan username benar (dengan atau tanpa `@`)
- Beberapa akun baru perlu 1000+ follower untuk Live
- Coba lagi setelah mulai Live

**Suara tidak keluar**
- Tap/klik layar browser sekali dulu (browser policy)
- Pastikan tombol 🔊 tidak di-mute

**Browser tidak konek ke server**
- Pastikan `node server.js` sudah berjalan
- Pastikan buka `http://localhost:3000` (bukan buka file HTML langsung)

---

## 📦 Struktur File

```
tiktok-fireworks/
├── server.js          ← Server Node.js (TikTok + WebSocket + HTTP)
├── package.json       ← Dependencies
├── README.md          ← Panduan ini
└── public/
    └── index.html     ← Game kembang api (Canvas + Web Audio)
```

---

Made with ❤️ — Selamat Live Streaming! 🎆
