@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
  )
)

if "%NODE_ENV%"=="" set "NODE_ENV=production"
if "%PORT%"=="" set "PORT=3000"
if "%MEDIAGRABBER_DATA_DIR%"=="" set "MEDIAGRABBER_DATA_DIR=%LOCALAPPDATA%\MediaGrabber"

if not exist "%MEDIAGRABBER_DATA_DIR%" mkdir "%MEDIAGRABBER_DATA_DIR%"

if not exist "node_modules" (
  call npm install --no-package-lock --legacy-peer-deps
)
if not exist "dist" (
  call npm run build
)

echo Starting MediaGrabber on http://0.0.0.0:%PORT% ...
call npm start
