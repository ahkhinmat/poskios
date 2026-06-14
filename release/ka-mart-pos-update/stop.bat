@echo off
setlocal EnableExtensions
title KA MART - Stop
cd /D "%~dp0"

set "NGINX_HOME=D:\nginx"
set "NGINX_EXE=%NGINX_HOME%\nginx.exe"
set "NGINX_CONF=%~dp0nginx.conf"
set "PM2_APP=ka-mart-backend"

echo === KA MART - Stop ===
echo.

where pm2 >nul 2>nul
if not errorlevel 1 (
  echo [1/2] Dung backend...
  pm2 stop "%PM2_APP%" >nul 2>nul
) else (
  echo [1/2] Bo qua PM2 vi khong tim thay trong PATH.
)

echo [2/2] Dung Nginx...
if exist "%NGINX_EXE%" (
  "%NGINX_EXE%" -p "%NGINX_HOME%" -c "%NGINX_CONF%" -s stop >nul 2>nul
)
call :kill_port 80
call :kill_port 3000

echo.
echo Da gui lenh dung frontend va backend.
pause
endlocal
exit /b 0

:kill_port
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%~1 .*LISTENING"') do (
  taskkill /F /PID %%P >nul 2>nul
)
exit /b 0
