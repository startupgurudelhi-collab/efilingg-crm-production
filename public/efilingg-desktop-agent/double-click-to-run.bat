@echo off
title Efilingg CRM V2 - Desktop Agent Runner
color 0B
cls

echo ====================================================================
echo               EFILINGG CRM V2 - INSTANT DESKTOP RUNNER
echo ====================================================================
echo.
echo This file will start your offline background agent immediately 
echo without requiring executable (.exe) compilation.
echo.

:: 1. Try to test if "node" is available by running it as a query.
echo [System] Checking for Node.js engine on this computer...
node -v >nul 2>&1
if errorlevel 1 goto NoNodeError

echo [Success] Node.js is detected!
echo.

:: 2. Check if node_modules exist. If not, trigger npm install.
if exist "%~dp0node_modules" goto RunAgent

echo [System] "node_modules" folder not found.
echo Installing required secure network libraries. This happens only once...
echo.
call npm install
if errorlevel 1 goto NpmInstallError

:RunAgent
cls
color 0A
echo ====================================================================
echo               EFILINGG CRM V2 - INSTANT DESKTOP RUNNER
echo ====================================================================
echo.
echo [Success] Workstation libraries verified successfully.
echo [Service] Booting Efilingg Agent loopback server on http://127.0.0.1:12112
echo.
echo KEEP THIS WINDOW OPEN while working in the CRM!
echo (You can minimize it to your taskbar; closing it will stop the integration)
echo.
echo ====================================================================
echo.

:: Stop existing instances first to free up Port 12112 and avoid EADDRINUSE crash
taskkill /f /im EfilinggDesktopAgent.exe >nul 2>&1
wmic process where "commandline like '%%agent.js%%'" call terminate >nul 2>&1
ping 127.0.0.1 -n 2 >nul

:: Start the agent. If it crashes or exits, go to the end pause to see the error.
call node agent.js
if errorlevel 1 goto RunTimeError

echo.
echo [Info] Agent stopped gracefully.
pause
exit /b 0


:NoNodeError
color 0F
echo.
echo --------------------------------------------------------------------
echo [!] ALERT: NODE.JS IS NOT DETECTED ON THIS COMPUTER
echo --------------------------------------------------------------------
echo Node.js is required to run the local integration background daemon.
echo.
echo Please follow these steps to resolve this:
echo.
echo   1. Open your web browser and navigate to: https://nodejs.org/
echo   2. Download and run the recommended LTS installer for Windows.
echo   3. Complete the installation wizard using default settings.
echo   4. Once finished, CLOSE all command prompt windows,
echo      then double-click "double-click-to-run.bat" again!
echo --------------------------------------------------------------------
echo.
echo Press any key to exit...
pause >nul
exit /b 1


:NpmInstallError
color 0C
echo.
echo --------------------------------------------------------------------
echo [!] ERROR: FAILED TO INSTALL REQUIRED DEPENDENCIES
echo --------------------------------------------------------------------
echo "npm install" returned an error code. 
echo Please verify that:
echo   1. Your internet connection is active.
echo   2. You have write permissions in this folder.
echo --------------------------------------------------------------------
echo.
echo Press any key to exit...
pause >nul
exit /b 1


:RunTimeError
color 0C
echo.
echo --------------------------------------------------------------------
echo [!] CRITICAL ERROR: DESKTOP AGENT CRASHED AT RUNTIME
echo --------------------------------------------------------------------
echo The agent started but crashed because of a runtime exception.
echo Please read the error message printed above to see what failed.
echo --------------------------------------------------------------------
echo.
echo Press any key to exit...
pause >nul
exit /b 1
