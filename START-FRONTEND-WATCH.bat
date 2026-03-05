@echo off
setlocal
title Frontend - E-comm Auto Restart

set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%vite-project"
set "NPM_CMD=npm.cmd"

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend folder not found: "%FRONTEND_DIR%"
  pause
  exit /b 1
)

cd /d "%FRONTEND_DIR%"

:loop
echo.
echo [%date% %time%] Starting frontend...
%NPM_CMD% run dev -- --host 0.0.0.0 --port 5173
set "EXIT_CODE=%errorlevel%"
echo [%date% %time%] Frontend exited with code %EXIT_CODE%.
echo Restarting frontend in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
