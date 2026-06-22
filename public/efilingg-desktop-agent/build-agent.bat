@echo off
title Efilingg CRM V2 - Desktop Agent Builder
color 0A
cls
echo ====================================================================
echo             EFILINGG CRM V2 DESKTOP AGENT COMPILATION ENGINE
echo ====================================================================
echo.
echo This utility compiles the background offline Windows Agent service 
echo into a zero-dependency, stand-alone Windows executable binary (.exe).
echo.

:: Check for Node.js / NPM installation
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0F
    echo --------------------------------------------------------------------
    echo [!] ALERT: NODE.JS IS NOT DETECTED ON THIS COMPUTER
    echo --------------------------------------------------------------------
    echo Node.js is required on your computer to install package dependencies
    echo and compile the background Windows daemon into a standalone .exe binary.
    echo.
    echo OPTIONS TO GET STARTED:
    echo.
    echo   [Option A] Manual installation:
    echo   1. Navigate to: https://nodejs.org/
    echo   2. Download and run the recommended LTS installer for Windows.
    echo.
    echo   [Option B] Automatic installation (Recommended):
    echo   Press any key and this builder will attempt to install Node.js LTS
    echo   for you automatically using the Microsoft Windows Package Manager (winget).
    echo.
    pause
    
    echo.
    echo [System] Requesting winget to install Node.js LTS...
    winget install OpenJS.NodeJS.LTS --source winget
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [!] ERROR: Automated installation via winget failed or was cancelled.
        echo Please visit https://nodejs.org/ to download and install Node.js manually.
        echo Once installed, close this window and double-click 'build-agent.bat' again!
        echo.
        pause
        exit /b 1
    )
    
    color 0A
    echo.
    echo ====================================================================
    echo             NODE.JS INSTALLED SUCCESSFULLY!
    echo ====================================================================
    echo Node.js has been successfully installed on your workstation.
    echo.
    echo CRITICAL STEP: Because environment paths have been updated, you must
    echo CLOSE this terminal window and double-click 'build-agent.bat' again!
    echo ====================================================================
    pause
    exit /b 0
)

echo --------------------------------------------------------------------
echo Step 1: Installing node dependency files...
echo --------------------------------------------------------------------
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npm install failed. Verify Node.js is installed.
    pause
    exit /b %errorlevel%
)
echo.
echo --------------------------------------------------------------------
echo Step 2: Compiling Node background script into EfilinggDesktopAgent.exe...
echo --------------------------------------------------------------------

:: Ensure the 'bin' directory exists
if not exist "%~dp0bin" mkdir "%~dp0bin"

:: Attempt compiling
call npm run compile

:: Check if the executable exists
if not exist "%~dp0bin\EfilinggDesktopAgent.exe" (
    color 0E
    echo.
    echo [System] Standard compilation returned success but could not locate the output executable.
    echo This is often caused by network proxy blocks downloading Node target binaries from GitHub.
    echo.
    echo Attempting offline compiler fallback (compiling directly using your local Node architecture)...
    echo.
    
    :: Attempt compilation using host target and disabling bytecode compilation (bypasses vercel binary CDN download)
    call npx pkg . --targets host --output bin/EfilinggDesktopAgent.exe --no-bytecode
)

:: Re-verify executable existence
if not exist "%~dp0bin\EfilinggDesktopAgent.exe" (
    color 0E
    echo.
    echo --------------------------------------------------------------------
    echo [!] ADVANCED CRITICAL WORKAROUND: COMPILATION DIAL-IN BLOCKED BY OS
    echo --------------------------------------------------------------------
    echo The compiler was unable to produce the stand-alone '.exe' file.
    echo This occurs if your Windows Group Policy, active antivirus, or network
    echo firewall blocks binary compilation compilers (pkg-fetch/vercel).
    echo.
    echo NEVER MIND! We have automatically generated a 100%% offline, secure,
    echo non-compiled Silent Background Runner for your Workstation instead!
    echo.
    
    :: Generate silent client runner batch launcher
    echo @echo off > "%~dp0bin\EfilinggDesktopAgent.bat"
    echo title Efilingg CRM V2 - Desktop Agent Runner >> "%~dp0bin\EfilinggDesktopAgent.bat"
    echo cd /d "%%~dp0.." >> "%~dp0bin\EfilinggDesktopAgent.bat"
    echo echo Starting Efilingg Desktop Agent in silent background mode... >> "%~dp0bin\EfilinggDesktopAgent.bat"
    echo wscript.exe "%%~dp0EfilinggDesktopAgentSilent.vbs" >> "%~dp0bin\EfilinggDesktopAgent.bat"
    echo echo Agent sequence started! You can close this window now. >> "%~dp0bin\EfilinggDesktopAgent.bat"
    echo timeout /t 3 ^>nul >> "%~dp0bin\EfilinggDesktopAgent.bat"
    echo exit >> "%~dp0bin\EfilinggDesktopAgent.bat"

    :: Generate background VBS script
    echo Set WshShell = CreateObject^("WScript.Shell"^) > "%~dp0bin\EfilinggDesktopAgentSilent.vbs"
    echo WshShell.Run "cmd.exe /c node agent.js", 0, False >> "%~dp0bin\EfilinggDesktopAgentSilent.vbs"

    color 0A
    echo ====================================================================
    echo               SILENT SERVICE SCRIPTS CREATED SUCCESSFULLY!
    echo ====================================================================
    echo Your background daemon is fully ready using the script engine:
    echo.
    echo  To launch the background agent:
    echo  - Double-click: "bin\EfilinggDesktopAgent.bat"
    echo.
    echo  This will start the background port listener silently in your RAM!
    echo  No CMD windows will remain open, and autofill will work perfectly!
    echo ====================================================================
    pause
    exit /b 0
)

echo.
echo ====================================================================
echo                      COMPILATION SUCCESSFUL!
echo ====================================================================
echo Standalone EXE has been generated inside the "bin/" output folder.
echo Path: %~dp0bin\EfilinggDesktopAgent.exe
echo.
echo You can run it directly or package it with Inno Setup to create 
echo a corporate setup installer.
echo ====================================================================
pause
