@echo off
setlocal EnableExtensions
title KA MART - Start
cd /D "%~dp0"

set "SILENT_MODE=0"
if /I "%~1"=="/silent" set "SILENT_MODE=1"

set "APP_ROOT=%~dp0"
set "NGINX_HOME=D:\nginx"
set "NGINX_EXE=%NGINX_HOME%\nginx.exe"
set "NGINX_CONF=%APP_ROOT%nginx.conf"
set "NGINX_HTML=%NGINX_HOME%\html\poskios"
set "BACKEND_ENTRY=%APP_ROOT%backend\dist\main.js"
set "BACKEND_DIR=%APP_ROOT%backend"
set "PM2_APP=ka-mart-backend"

echo === KA MART - Start ===
echo.

if not exist "%NGINX_EXE%" (
  echo Loi: Khong tim thay Nginx: "%NGINX_EXE%"
  if "%SILENT_MODE%"=="0" pause
  exit /b 1
)

if not exist "%NGINX_CONF%" (
  echo Loi: Khong tim thay nginx.conf: "%NGINX_CONF%"
  if "%SILENT_MODE%"=="0" pause
  exit /b 1
)

if not exist "%BACKEND_ENTRY%" (
  echo Loi: Backend chua duoc build: "%BACKEND_ENTRY%"
  if "%SILENT_MODE%"=="0" pause
  exit /b 1
)

if not exist "%APP_ROOT%frontend\dist\index.html" (
  echo Loi: Frontend chua duoc build: "%APP_ROOT%frontend\dist\index.html"
  if "%SILENT_MODE%"=="0" pause
  exit /b 1
)

if not exist "%APP_ROOT%backend\.env" (
  echo Loi: Thieu file backend\.env: "%APP_ROOT%backend\.env"
  if "%SILENT_MODE%"=="0" pause
  exit /b 1
)

where pm2 >nul 2>nul
if errorlevel 1 (
  echo Loi: Khong tim thay PM2 trong PATH.
  if "%SILENT_MODE%"=="0" pause
  exit /b 1
)

if not exist "%NGINX_HTML%" (
  mkdir "%NGINX_HTML%" >nul 2>nul
)

echo [1/4] Dong Nginx cu neu dang chay...
"%NGINX_EXE%" -p "%NGINX_HOME%" -c "%NGINX_CONF%" -s stop >nul 2>nul
call :kill_port 80

echo [2/4] Dong backend cu neu dang chay...
pm2 delete "%PM2_APP%" >nul 2>nul

echo [3/4] Dong bo frontend vao D:\nginx\html\poskios...
xcopy /y /s /e /i /q "%APP_ROOT%frontend\dist\*" "%NGINX_HTML%\" >nul
if errorlevel 1 (
  echo Loi: Khong copy duoc frontend dist vao "%NGINX_HTML%".
  pause
  exit /b 1
)

echo [4/4] Khoi dong Nginx va backend...
start "KA MART Nginx" /MIN "%NGINX_EXE%" -p "%NGINX_HOME%" -c "%NGINX_CONF%"

pm2 start "%BACKEND_ENTRY%" --name "%PM2_APP%" --cwd "%BACKEND_DIR%"
if errorlevel 1 (
  echo Loi: PM2 khong khoi dong duoc backend.
  pause
  exit /b 1
)

pm2 save >nul 2>nul

echo.
echo Frontend: http://localhost
echo Backend:  http://localhost:3000/api/v1
echo.
echo Dung status.bat de kiem tra trang thai.
if "%SILENT_MODE%"=="0" pause
endlocal
exit /b 0

:kill_port
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%~1 .*LISTENING"') do (
  taskkill /F /PID %%P >nul 2>nul
)
exit /b 0
