#!/bin/bash
echo ""
echo " ========================================"
echo "  TikTok Gift Fireworks - Starting..."
echo " ========================================"
echo ""

# Install if needed
if [ ! -d "node_modules" ]; then
  echo " [1/2] Installing dependencies..."
  npm install
  echo ""
fi

echo " [2/2] Starting server..."
echo ""
echo " PENTING: Edit server.js dan ganti TIKTOK_USERNAME dengan username kamu!"
echo ""
node server.js
