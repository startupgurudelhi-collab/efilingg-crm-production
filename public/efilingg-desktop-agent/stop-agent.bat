@echo off
title Efilingg CRM V2 - Stop Background Agent
color 0C
cls

echo ====================================================================
echo               STOPPING EFILINGG CRM DESKTOP AGENT
echo ====================================================================
echo.
echo This utility will find and terminate any running instances of the 
echo Efilingg background agent to release local system RAM.
echo.

:: Stop compiled .exe agent
taskkill /f /im EfilinggDesktopAgent.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [Success] Stopped background service instance: EfilinggDesktopAgent.exe
) else (
    echo [Info] EfilinggDesktopAgent.exe background service was not running.
)

:: Terminate agent running via Node
wmic process where "commandline like '%%agent.js%%'" call terminate >nul 2>&1
if %errorlevel% equ 0 (
    echo [Success] Stopped native Node background process instances.
)

echo.
echo ====================================================================
echo             BACKGROUND AGENT TERMINATED SUCCESSFULLY!
echo ====================================================================
echo.
echo The agent has been stopped. Autofill features are now offline.
echo To start it again, double-click 'run-silently.vbs' or 'double-click-to-run.bat'.
echo.
pause
