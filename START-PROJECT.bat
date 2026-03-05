@echo off
setlocal
setlocal EnableDelayedExpansion
title E-Commerce Launcher

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%vite-project"
set "BACKEND_WATCHER=%ROOT%START-BACKEND-WATCH.bat"
set "FRONTEND_WATCHER=%ROOT%START-FRONTEND-WATCH.bat"
set "BACKEND_URL=http://127.0.0.1:5001/health"
set "FRONTEND_URL=http://127.0.0.1:5173"
set "NPM_CMD=npm.cmd"

echo ========================================
echo   E-Commerce: Starting Backend + Frontend
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js and run again.
  pause
  exit /b 1
)

where %NPM_CMD% >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm.cmd not found. Reinstall Node.js and run again.
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] Backend folder not found: "%BACKEND_DIR%"
  pause
  exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] Frontend folder not found: "%FRONTEND_DIR%"
  pause
  exit /b 1
)

if not exist "%BACKEND_WATCHER%" (
  echo [ERROR] Missing watcher script: "%BACKEND_WATCHER%"
  pause
  exit /b 1
)

if not exist "%FRONTEND_WATCHER%" (
  echo [ERROR] Missing watcher script: "%FRONTEND_WATCHER%"
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\node_modules" (
  echo [Setup] Installing backend dependencies...
  cmd /c "cd /d ""%BACKEND_DIR%"" && %NPM_CMD% install"
  if errorlevel 1 (
    echo [ERROR] Backend dependency install failed.
    pause
    exit /b 1
  )
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo [Setup] Installing frontend dependencies...
  cmd /c "cd /d ""%FRONTEND_DIR%"" && %NPM_CMD% install"
  if errorlevel 1 (
    echo [ERROR] Frontend dependency install failed.
    pause
    exit /b 1
  )
)

echo [1/2] Starting backend on port 5001...
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  start "Backend - E-comm (Auto-Restart)" cmd /k "call ""%BACKEND_WATCHER%"""
) else (
  echo Backend process already listening on port 5001. Checking health...
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%BACKEND_URL%' -TimeoutSec 2; if($r.StatusCode -eq 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>&1
  if errorlevel 1 (
    echo Existing backend is unhealthy. Restarting backend...
    for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING"') do (
      if not "%%P"=="" (
        taskkill /F /PID %%P >nul 2>&1
      )
    )
    timeout /t 1 /nobreak >nul
    start "Backend - E-comm (Auto-Restart)" cmd /k "call ""%BACKEND_WATCHER%"""
  ) else (
    echo Backend is healthy. Skipping new backend window.
  )
)

echo [2/2] Starting frontend on port 5173...
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (
  start "Frontend - E-comm (Auto-Restart)" cmd /k "call ""%FRONTEND_WATCHER%"""
) else (
  echo Frontend already running on port 5173. Skipping new frontend window.
)

echo.
echo Waiting for frontend to become ready...
set /a ATTEMPTS=0

:wait_frontend
set /a ATTEMPTS+=1
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%FRONTEND_URL%' -TimeoutSec 2; if($r.StatusCode -ge 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto open_site
if %ATTEMPTS% GEQ 30 goto timeout_frontend
timeout /t 2 /nobreak >nul
goto wait_frontend

:open_site
echo Frontend is ready. Opening website...
start "" "%FRONTEND_URL%"

echo Checking backend health...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%BACKEND_URL%' -TimeoutSec 2; if($r.StatusCode -ge 200){exit 0}else{exit 1} } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo [WARNING] Backend is not healthy yet at %BACKEND_URL%
  echo           Check the Backend window for errors.
) else (
  echo Backend health check passed.
)
goto done

:timeout_frontend
echo [WARNING] Frontend did not respond in time.
echo           Opening website anyway: %FRONTEND_URL%
start "" "%FRONTEND_URL%"

:done
echo.
echo ========================================
echo   Running
echo ========================================
echo   Backend:  http://127.0.0.1:5001
echo   Frontend: %FRONTEND_URL%
echo ========================================
echo.
echo Backend and frontend are now running with auto-restart watchers.
echo To stop everything: close both Backend and Frontend terminal windows.
echo To auto-start on Windows login: run ENABLE-AUTO-START.bat once.
echo.
pause
