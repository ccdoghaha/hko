@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo   HKO 本地天氣站  /  HKO local weather station
echo ============================================================
echo.

set /p PORT=請輸入連接埠 (直接按 Enter 使用 8787): 
if "%PORT%"=="" set PORT=8787

where node >nul 2>nul
if errorlevel 1 (
  echo [X] 找不到 Node.js。請先安裝 Node.js 18 或以上版本。
  echo     https://nodejs.org/
  pause
  exit /b 1
)

echo.
echo 啟動中... 瀏覽器將自動開啟 http://localhost:%PORT%/
echo 按 Ctrl+C 可停止伺服器。
echo.

start "" /b cmd /c "timeout /t 2 >nul & start "" http://localhost:%PORT%/"

node server.js %PORT%
pause
