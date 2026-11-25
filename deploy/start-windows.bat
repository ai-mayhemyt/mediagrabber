@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    set "K=%%A"
    if not "!K!"=="" if not "!K:~0,1!"=="#" set "!K!=%%B"
  )
)

if "%NODE_ENV%"=="" set "NODE_ENV=production"
if "%PORT%"=="" set "PORT=3000"
if "%MEDIAGRABBER_DATA_DIR%"=="" set "MEDIAGRABBER_DATA_DIR=%LOCALAPPDATA%\MediaGrabber"

if not exist "%MEDIAGRABBER_DATA_DIR%" mkdir "%MEDIAGRABBER_DATA_DIR%"

rem Ensure WinGet Links and Python Scripts directories are visible on PATH
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Links" set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
  if exist "%%~fD\Scripts" set "PATH=%%~fD\Scripts;%PATH%"
)
for /d %%D in ("%APPDATA%\Python\Python*") do (
  if exist "%%~fD\Scripts" set "PATH=%%~fD\Scripts;%PATH%"
)

if not exist "node_modules" (
  call npm install --no-package-lock --legacy-peer-deps
)
if not exist "dist\index.html" (
  call npm run build
)
if not exist "dist-server\server.cjs" (
  call npm run build:server
)

echo Starting MediaGrabber on http://127.0.0.1:%PORT% ...
node "dist-server\server.cjs" %*
