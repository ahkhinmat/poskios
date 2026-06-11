@echo off
title POS Kiosk - Deploy
cd /D "%~dp0"

echo ================================
echo  POS Kiosk - Cap nhat code
echo ================================

if not exist "backend\.env" (
  echo.
  echo  *** Canh bao: Thieu file backend\.env ***
  echo  Tao file backend\.env:
  echo.
  echo  DB_HOST=localhost
  echo  DB_USERNAME=sa
  echo  DB_PASSWORD=matkhau
  echo  DB_NAME=POS
  echo.
  pause
)

echo [0/5] Copy frontend to Nginx...
xcopy /y /s /e /q "%~dp0frontend\dist\*" D:\nginx\html\poskios\ >nul 2>&1

echo [1/5] Pull code tu GitHub...
git pull
if %errorlevel% neq 0 (
  echo Loi: Khong pull duoc code.
  pause
  exit /b
)

echo [2/5] Cai dependencies Backend...
cd backend
call npm install

echo [3/5] Build Backend...
call npx tsc
if %errorlevel% neq 0 (
  echo Loi: Build backend that bai.
  pause
  exit /b
)

echo [4/5] Build Frontend...
cd ..\frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
  echo Loi: Build frontend that bai.
  pause
  exit /b
)

:: Copy frontend sau khi build
xcopy /y /s /e /q "dist\*" D:\nginx\html\poskios\ >nul 2>&1

echo [5/5] Restart Backend...
cd ..\
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

cd backend
start /B "" npm run start:prod

echo.
echo ======== HOAN TAT ========
echo Frontend: http://localhost
echo.
pause
