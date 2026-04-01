@echo off
echo.
echo  ========================================
echo   TikTok Gift Fireworks - Starting...
echo  ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo  [1/2] Installing dependencies...
    npm install
    echo.
)

echo  [2/2] Starting server...
echo.
echo  PENTING: Edit server.js dan ganti TIKTOK_USERNAME dengan username kamu!
echo.
node server.js
pause
