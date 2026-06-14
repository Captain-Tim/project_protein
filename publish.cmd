@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul || set "NODE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.16.0-win-x64\node.exe"
echo Refreshing data from Notion...
"%NODE%" scripts\export.js || (echo. & echo [!] Export failed - see message above. & pause & exit /b 1)
echo Publishing to Netlify...
"%NODE%" scripts\publish.js || (echo. & echo [!] Publish failed - see message above. & pause & exit /b 1)
echo.
echo Copy the link above and share it.
pause
