@echo off
setlocal EnableExtensions
title KA MART - Deploy
cd /D "%~dp0"

set "APP_ROOT=%~dp0"
set "NGINX_HOME=D:\nginx"
set "NGINX_HTML=%NGINX_HOME%\html\poskios"
set "BACKEND_ENTRY=%APP_ROOT%backend\dist\main.js"

echo === KA MART - Deploy ===
echo.
echo Script nay dung cho may khach da co Node.js, PM2, Nginx va SQL Server.
echo Khong can Git, npm install hay npm build tren may khach.
echo.

if not exist "%APP_ROOT%frontend\dist\index.html" (
  echo Loi: Frontend chua duoc build: "%APP_ROOT%frontend\dist\index.html"
  pause
  exit /b 1
)

if not exist "%BACKEND_ENTRY%" (
  echo Loi: Backend chua duoc build: "%BACKEND_ENTRY%"
  pause
  exit /b 1
)

if not exist "%APP_ROOT%backend\.env" (
  echo Loi: Thieu file backend\.env: "%APP_ROOT%backend\.env"
  pause
  exit /b 1
)

if not exist "%NGINX_HTML%" (
  mkdir "%NGINX_HTML%" >nul 2>nul
)

echo [1/2] Copy frontend dist vao D:\nginx\html\poskios...
xcopy /y /s /e /i /q "%APP_ROOT%frontend\dist\*" "%NGINX_HTML%\" >nul
if errorlevel 1 (
  echo Loi: Copy frontend that bai.
  pause
  exit /b 1
)

echo [2/2] Restart he thong...
call "%APP_ROOT%start.bat" /silent
if errorlevel 1 (
  echo Loi: Khoi dong lai he thong that bai.
  pause
  exit /b 1
)

echo.
echo Deploy hoan tat.
pause
endlocal
exit /b 0
