@echo off
title POS Kiosk
cd /D "%~dp0"

echo === POS Kiosk ===

:: Kill old processes
taskkill /f /im nginx.exe 2>nul
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

:: Start Nginx
start /B "" D:\nginx\nginx.exe

:: Start Backend
cd backend
start /B "" npm run start:prod

echo.
echo Frontend: http://localhost
echo Backend:  http://localhost:3000
echo.
echo Dong cua so nay de tat dich vu.
pause

:: Cleanup on close
taskkill /f /im nginx.exe 2>nul
taskkill /f /im node.exe 2>nul
