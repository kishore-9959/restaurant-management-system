@echo off
setlocal enabledelayedexpansion

REM Ensure Node.js binaries take priority
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ===================================================
echo   Restaurant Management System (RMS)
echo   Stopping All 14 Microservices & API Gateway
echo ===================================================

set PORTS=8000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010 8011 8012 8013

for %%P in (%PORTS%) do (
    for /f "tokens=5" %%A in ('netstat -ano -p tcp ^| findstr /C:":%%P " ^| findstr /I "LISTENING"') do (
        set PID_TO_KILL=%%A
        if defined PID_TO_KILL (
            if "!PID_TO_KILL!" neq "0" (
                echo Stopping process !PID_TO_KILL! on port %%P...
                taskkill /F /T /PID !PID_TO_KILL! >nul 2>&1
            )
        )
    )
)

echo ===================================================
echo   All RMS services on ports 8000-8013 stopped.
echo ===================================================
ping 127.0.0.1 -n 3 >nul
