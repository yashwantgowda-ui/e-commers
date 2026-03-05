@echo off
setlocal
title Disable E-comm Auto Start

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_DIR%\E-comm Launcher.lnk"

if exist "%SHORTCUT%" (
  del /f /q "%SHORTCUT%"
  if errorlevel 1 (
    echo [ERROR] Could not remove startup shortcut:
    echo        "%SHORTCUT%"
    pause
    exit /b 1
  )
  echo [OK] Auto-start disabled.
) else (
  echo Auto-start shortcut not found. Nothing to disable.
)

pause
