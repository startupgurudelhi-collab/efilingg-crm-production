' Efilingg CRM V2 - Silent Background Agent Launcher
' This script starts the Efilingg Desktop Agent completely silently in the background.
' There will be NO visual command prompt or console window.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim currentDir
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' IMPORTANT: Terminate any existing background instances of the agent to free up Port 12112 and avoid EADDRINUSE crash
WshShell.Run "taskkill /f /im EfilinggDesktopAgent.exe", 0, True
WshShell.Run "wmic process where ""commandline like '%agent.js%'"" call terminate", 0, True
WScript.Sleep 1000 ' Wait 1 second for OS to release the socket binding

' 1. Check if the compiled .exe file is present in the bin folder
Dim exePath
exePath = currentDir & "\bin\EfilinggDesktopAgent.exe"

If fso.FileExists(exePath) Then
    ' Start the compiled executable silently
    WshShell.Run """" & exePath & """", 0, False
    MsgBox "Efilingg Desktop Agent has been launched inside your background system RAM." & vbCrLf & vbCrLf & "It is now running silently with NO open window." & vbCrLf & "Autofill features are active in the CRM!" & vbCrLf & vbCrLf & "To stop it anytime, run 'stop-agent.bat'.", 64, "Efilingg Agent - Silent Start"
Else
    ' Fallback to Node if the .exe is missing
    WshShell.Run "cmd.exe /c node agent.js", 0, False
    MsgBox "Efilingg Desktop Agent (Node fallback) has been launched inside your background system RAM." & vbCrLf & vbCrLf & "It is now running silently with NO open window." & vbCrLf & "Autofill features are active in the CRM!" & vbCrLf & vbCrLf & "To stop it anytime, run 'stop-agent.bat'.", 64, "Efilingg Agent - Silent Start"
End If
