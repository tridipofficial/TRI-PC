@echo off
title TRI AI - GitHub Sync
cd /d "%~dp0"
echo ====================================================
echo        TRI AI - Synchronizing with GitHub
echo     Repo: https://github.com/tridipofficial/TRI-PC
echo ====================================================
echo.
echo 1. Checking repository status...
git status --short

echo.
echo 2. Staging all project changes (Strictly protecting .env)...
git add .

echo.
echo 3. Committing latest updates...
git commit -m "TRI AI Update: %DATE% %TIME%"

echo.
echo 4. Pushing to GitHub (https://github.com/tridipofficial/TRI-PC)...
echo [NOTE] If a browser window opens, please click 'Sign in with your browser' to authorize once.
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ====================================================
    echo [SUCCESS] Successfully synced with GitHub!
    echo Visit: https://github.com/tridipofficial/TRI-PC
    echo ====================================================
) else (
    echo [NOTICE] Push needs one-time browser authorization.
)
echo.
pause
