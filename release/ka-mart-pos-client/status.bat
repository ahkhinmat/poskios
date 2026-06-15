@echo off
setlocal EnableExtensions
title KA MART - Status
cd /D "%~dp0"

set "PM2_APP=ka-mart-backend"

echo === KA MART - Status ===
echo.

call :check_port 80 Frontend
call :check_port 3000 Backend

echo.
where pm2 >nul 2>nul
if errorlevel 1 (
  echo PM2: KHONG TIM THAY TRONG PATH
) else (
  echo PM2:
  pm2 describe "%PM2_APP%"
)

echo.
echo Frontend URL: http://localhost
echo Backend URL:  http://localhost:3000/api/v1
echo.
pause
endlocal
exit /b 0

:check_port
set "FOUND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%~1 .*LISTENING"') do (
  set "FOUND=1"
)

if defined FOUND (
  echo %~2: DANG CHAY tren cong %~1
) else (
  echo %~2: CHUA CHAY tren cong %~1
)
exit /b 0
