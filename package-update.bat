@echo off
setlocal EnableExtensions
title KA MART - Package Update
cd /D "%~dp0"

set "APP_ROOT=%~dp0"
set "OUTPUT_ROOT=%APP_ROOT%release"
set "PACKAGE_DIR=%OUTPUT_ROOT%\ka-mart-pos-update"

echo === KA MART - Package Update (lightweight) ===
echo.

if not exist "%APP_ROOT%backend\dist\main.js" (
  echo Loi: Backend chua duoc build: "%APP_ROOT%backend\dist\main.js"
  pause
  exit /b 1
)

if not exist "%APP_ROOT%frontend\dist\index.html" (
  echo Loi: Frontend chua duoc build: "%APP_ROOT%frontend\dist\index.html"
  pause
  exit /b 1
)

if exist "%PACKAGE_DIR%" (
  rmdir /s /q "%PACKAGE_DIR%"
)

mkdir "%PACKAGE_DIR%" >nul 2>nul
mkdir "%PACKAGE_DIR%\backend" >nul 2>nul
mkdir "%PACKAGE_DIR%\frontend" >nul 2>nul
mkdir "%PACKAGE_DIR%\docs" >nul 2>nul

echo [1/5] Copy backend dist...
xcopy /y /s /e /i /q "%APP_ROOT%backend\dist\*" "%PACKAGE_DIR%\backend\dist\" >nul
if errorlevel 1 goto :copy_error

echo [2/5] Copy frontend dist...
xcopy /y /s /e /i /q "%APP_ROOT%frontend\dist\*" "%PACKAGE_DIR%\frontend\dist\" >nul
if errorlevel 1 goto :copy_error

echo [3/5] Copy scripts...
copy /y "%APP_ROOT%deploy.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%start.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%stop.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%status.bat" "%PACKAGE_DIR%\" >nul

echo [4/5] Copy config files...
copy /y "%APP_ROOT%nginx.conf" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%ecosystem.config.cjs" "%PACKAGE_DIR%\" >nul

echo [5/5] Copy SQL alter scripts...
if exist "%APP_ROOT%docs\sqlserver-alter-allow-negative-stock.sql" (
  copy /y "%APP_ROOT%docs\sqlserver-alter-allow-negative-stock.sql" "%PACKAGE_DIR%\docs\" >nul
)
if exist "%APP_ROOT%docs\sqlserver-alter-pos-draft-tabs-purchase-meta.sql" (
  copy /y "%APP_ROOT%docs\sqlserver-alter-pos-draft-tabs-purchase-meta.sql" "%PACKAGE_DIR%\docs\" >nul
)
if exist "%APP_ROOT%docs\sqlserver-alter-product-variant-group.sql" (
  copy /y "%APP_ROOT%docs\sqlserver-alter-product-variant-group.sql" "%PACKAGE_DIR%\docs\" >nul
)

echo.
echo === Hoan tat ===
echo Thu muc cap nhat:
echo %PACKAGE_DIR%
echo.
echo Dung luong:
dir /s "%PACKAGE_DIR%" 2>nul | findstr /i "File(s)"
echo.
echo Cach su dung:
echo 1. Copy toan bo thu muc nay de len may khach
echo 2. Chay docs\*.sql neu co tren SQL Server (ALTER, khong gay mat du lieu)
echo 3. Chay deploy.bat de cap nhat frontend va khoi dong lai he thong
echo.
pause
endlocal
exit /b 0

:copy_error
echo Loi: Copy file that bai.
pause
endlocal
exit /b 1
