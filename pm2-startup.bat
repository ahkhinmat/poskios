@echo off
setlocal EnableExtensions
title KA MART - PM2 Startup
cd /D "%~dp0"

echo === KA MART - PM2 Startup ===
echo.

where pm2 >nul 2>nul
if errorlevel 1 (
  echo Loi: Khong tim thay PM2 trong PATH.
  pause
  exit /b 1
)

echo [1/2] Dang dang ky PM2 Startup cho Windows...
pm2 startup
if errorlevel 1 (
  echo Loi: pm2 startup that bai.
  pause
  exit /b 1
)

echo [2/2] Dang luu danh sach process hien tai...
pm2 save
if errorlevel 1 (
  echo Loi: pm2 save that bai.
  pause
  exit /b 1
)

echo.
echo Hoan tat. Backend se tu khoi dong lai sau reboot neu da duoc start bang PM2.
pause
endlocal
exit /b 0
