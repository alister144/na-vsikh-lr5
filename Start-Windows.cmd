@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or newer and run this file again.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173/ in your browser. Keep this window open.
node src\serve.mjs
pause
