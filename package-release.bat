@echo off
setlocal EnableExtensions
title KA MART - Package Release
cd /D "%~dp0"

set "APP_ROOT=%~dp0"
set "OUTPUT_ROOT=%APP_ROOT%release"
set "PACKAGE_DIR=%OUTPUT_ROOT%\ka-mart-pos"

echo === KA MART - Package Release ===
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

if not exist "%APP_ROOT%backend\.env" (
  echo Loi: Thieu file backend\.env: "%APP_ROOT%backend\.env"
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

echo [1/6] Copy backend dist...
xcopy /y /s /e /i /q "%APP_ROOT%backend\dist\*" "%PACKAGE_DIR%\backend\dist\" >nul
if errorlevel 1 goto :copy_error

echo [2/6] Copy backend node_modules...
xcopy /y /s /e /i /q "%APP_ROOT%backend\node_modules\*" "%PACKAGE_DIR%\backend\node_modules\" >nul
if errorlevel 1 goto :copy_error

echo [3/6] Copy backend config...
copy /y "%APP_ROOT%backend\package.json" "%PACKAGE_DIR%\backend\" >nul
copy /y "%APP_ROOT%backend\package-lock.json" "%PACKAGE_DIR%\backend\" >nul
copy /y "%APP_ROOT%backend\.env" "%PACKAGE_DIR%\backend\" >nul

echo [4/6] Copy frontend dist...
xcopy /y /s /e /i /q "%APP_ROOT%frontend\dist\*" "%PACKAGE_DIR%\frontend\dist\" >nul
if errorlevel 1 goto :copy_error

echo [5/6] Copy scripts va tai lieu...
copy /y "%APP_ROOT%nginx.conf" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%ecosystem.config.cjs" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%start.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%stop.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%status.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%deploy.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%pm2-startup.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%pm2-save.bat" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%CUSTOMER_DEPLOYMENT.md" "%PACKAGE_DIR%\" >nul
copy /y "%APP_ROOT%docs\sqlserver-create-pos-db.sql" "%PACKAGE_DIR%\docs\" >nul
copy /y "%APP_ROOT%docs\sqlserver-alter-product-variant-group.sql" "%PACKAGE_DIR%\docs\" >nul
copy /y "%APP_ROOT%docs\sqlserver-mvp-schema.sql" "%PACKAGE_DIR%\docs\" >nul
copy /y "%APP_ROOT%docs\sqlserver-seed-test-users.sql" "%PACKAGE_DIR%\docs\" >nul

echo [6/6] Hoan tat...
echo.
echo Thu muc ban giao:
echo %PACKAGE_DIR%
echo.
pause
endlocal
exit /b 0

:copy_error
echo Loi: Copy file that bai.
pause
endlocal
exit /b 1
