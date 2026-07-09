@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul || set "NODE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.16.0-win-x64\node.exe"
echo Building dashboard from local data...
"%NODE%" scripts\build_dashboard.js || (echo. & echo [!] Build failed - see message above. & pause & exit /b 1)

git add dashboard.html data

set "CHANGED="
for /f "delims=" %%i in ('git status --porcelain -- dashboard.html data') do set "CHANGED=1"

if defined CHANGED (
  git commit -m "chore: publish dashboard" || (echo. & echo [!] Commit failed. & pause & exit /b 1)
  git push || (echo. & echo [!] Push failed - see message above. & pause & exit /b 1)
  echo.
  echo Pushed. GitHub Actions is deploying, usually ready in ~30-60s.
) else (
  echo.
  echo No changes to publish - dashboard already up to date on GitHub Pages.
)

echo.
echo Live at: https://captain-tim.github.io/project_protein/
pause
