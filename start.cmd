@echo off
setlocal
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%vite-project"
set "NPM_CMD=npm.cmd"
set "BACKEND_URL=http://127.0.0.1:5001/health"

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] Backend project not found at "%BACKEND_DIR%".
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend project not found at "%FRONTEND_DIR%".
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  exit /b 1
)

where %NPM_CMD% >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm.cmd is not available in PATH.
  exit /b 1
)

if not exist "%BACKEND_DIR%\node_modules" (
  echo [Setup] Installing backend dependencies...
  cmd /c "cd /d ""%BACKEND_DIR%"" && %NPM_CMD% install"
  if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies.
    exit /b 1
  )
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo [Setup] Installing frontend dependencies...
  cmd /c "cd /d ""%FRONTEND_DIR%"" && %NPM_CMD% install"
  if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies.
    exit /b 1
  )
)

echo Clearing stale listeners on ports 5001 and 5173...
for %%Q in (5001 5173) do (
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%%Q" ^| findstr "LISTENING"') do (
    if not "%%P"=="" (
      taskkill /F /PID %%P >nul 2>&1
    )
  )
)
timeout /t 1 /nobreak >nul

echo Starting backend and frontend...
node "%ROOT%run-dev.js"
