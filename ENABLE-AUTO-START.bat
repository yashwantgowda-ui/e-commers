@echo off
setlocal
title Enable E-comm Auto Start

set "ROOT=%~dp0"
set "START_CMD=cd /d ""%ROOT%"" && npm.cmd start"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\E-comm Launcher.lnk"

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm.cmd not found. Install Node.js first.
  pause
  exit /b 1
)

echo Creating Startup shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$W = New-Object -ComObject WScript.Shell; " ^
  "$S = $W.CreateShortcut('%SHORTCUT%'); " ^
  "$S.TargetPath = 'C:\\Windows\\System32\\cmd.exe'; " ^
  "$S.Arguments = '/c %START_CMD%'; " ^
  "$S.WorkingDirectory = '%ROOT%'; " ^
  "$S.WindowStyle = 1; " ^
  "$S.Description = 'Start E-comm backend and frontend (npm start)'; " ^
  "$S.Save()"

if errorlevel 1 (
  echo [ERROR] Failed to create startup shortcut.
  pause
  exit /b 1
)

echo [OK] Auto-start enabled.
echo It will run after Windows sign-in.
echo To disable later, run DISABLE-AUTO-START.bat
pause
