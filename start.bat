@echo off
title TRI AI Desktop Assistant
cd /d "%~dp0"
echo ====================================================
echo          TRI AI - Personal Windows Assistant
echo              Clean-Room Implementation
echo ====================================================
echo.
echo Checking Node.js runtime...
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH! Please install Node.js.
    pause
    exit /b 1
)

echo Starting local TRI AI server on http://localhost:3456 ...
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" http://localhost:3456
) else (
    start "" http://localhost:3456
)
node server.js
pause
