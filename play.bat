@echo off
REM Temple Builder launcher.
REM Starts the local server (if not already running) and opens the game.
REM ES Modules do not work from file://, so a server is required.

cd /d "%~dp0"

REM --- start the server only if port 8080 is not already listening ---
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if errorlevel 1 (
  start "TempleBuilder server" /min node tools\serve.mjs 8080
  timeout /t 2 /nobreak >nul
)

REM --- open as a clean app window (no tabs/address bar) if Edge exists ---
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe

if exist "%EDGE%" (
  start "" "%EDGE%" --app=http://localhost:8080 --window-size=1280,760
) else (
  start "" http://localhost:8080
)

exit /b 0
