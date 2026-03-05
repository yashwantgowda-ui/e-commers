@echo off
setlocal
title Backend - E-comm Auto Restart

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "NPM_CMD=npm.cmd"

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] Backend folder not found: "%BACKEND_DIR%"
  pause
  exit /b 1
)

cd /d "%BACKEND_DIR%"

echo Checking MongoDB service...
sc query MongoDB >nul 2>&1
if not errorlevel 1 (
  net start MongoDB >nul 2>&1
)
sc query MongoDBServer >nul 2>&1
if not errorlevel 1 (
  net start MongoDBServer >nul 2>&1
)

:loop
echo.
echo [%date% %time%] Starting backend...
%NPM_CMD% run dev
set "EXIT_CODE=%errorlevel%"
echo [%date% %time%] Backend exited with code %EXIT_CODE%.
echo Restarting backend in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
