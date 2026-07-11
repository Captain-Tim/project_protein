@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul || set "NODE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.16.0-win-x64\node.exe"
git pull
echo Building dashboard from local data...
"%NODE%" scripts\build_dashboard.js || (echo. & echo [!] Build failed - see message above. & pause & exit /b 1)
start "" "dashboard.html"
