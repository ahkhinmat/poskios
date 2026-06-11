@echo off
setlocal EnableExtensions
title KA MART - PM2 Save
cd /D "%~dp0"

echo === KA MART - PM2 Save ===
echo.

where pm2 >nul 2>nul
if errorlevel 1 (
  echo Loi: Khong tim thay PM2 trong PATH.
  pause
  exit /b 1
)

pm2 save
if errorlevel 1 (
  echo Loi: pm2 save that bai.
  pause
  exit /b 1
)

echo Da luu danh sach process PM2 hien tai.
pause
endlocal
exit /b 0
