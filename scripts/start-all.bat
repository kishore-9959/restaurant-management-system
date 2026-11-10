@echo off
setlocal enabledelayedexpansion

REM Ensure Node.js binaries take priority over any system32 collisions
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ===================================================
echo   Restaurant Management System (RMS)
echo   Starting All 14 Microservices + API Gateway
echo ===================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "BACKEND_DIR=%ROOT_DIR%\backend"

REM ----------------------------------------------------
REM Define microservices and ports (comma-separated)
REM ----------------------------------------------------
set SERVICES_AND_PORTS=auth-service:8001,user-service:8002,restaurant-service:8003,cms-service:8004,menu-service:8005,cart-service:8006,order-service:8007,payment-service:8008,inventory-service:8009,kitchen-service:8010,reservation-service:8011,notification-service:8012,report-service:8013

REM ----------------------------------------------------
REM 1. Start all 13 domain microservices first
REM ----------------------------------------------------
for %%A in (%SERVICES_AND_PORTS%) do (
    for /f "tokens=1,2 delims=:" %%B in ("%%A") do (
        set SERVICE_NAME=%%B
        set SERVICE_PORT=%%C

        if exist "%BACKEND_DIR%\!SERVICE_NAME!" (
            REM Check if service is already running on its port
            netstat -ano | findstr /R /C:":!SERVICE_PORT! " >nul
            if !errorlevel! equ 0 (
                echo [INFO] !SERVICE_NAME! is already running on port !SERVICE_PORT! - Skipping...
            ) else (
                echo Starting Service: !SERVICE_NAME! on port !SERVICE_PORT!...
                start "RMS - !SERVICE_NAME! (:!SERVICE_PORT!)" cmd /k "cd /d "%BACKEND_DIR%\!SERVICE_NAME!" && npm run dev"
                call :WaitForPort !SERVICE_PORT! "!SERVICE_NAME!"
            )
        ) else (
            echo [WARNING] Service directory not found: "%BACKEND_DIR%\!SERVICE_NAME!" - Skipping...
        )
    )
)

REM ----------------------------------------------------
REM 2. Start API Gateway last (Port 8000)
REM ----------------------------------------------------
set GATEWAY_NAME=api-gateway
set GATEWAY_PORT=8000

if exist "%BACKEND_DIR%\%GATEWAY_NAME%" (
    REM Check if API Gateway is already running
    netstat -ano | findstr /R /C:":%GATEWAY_PORT% " >nul
    if !errorlevel! equ 0 (
        echo [INFO] API Gateway is already running on port %GATEWAY_PORT% - Skipping...
    ) else (
        echo Starting API Gateway on port %GATEWAY_PORT%...
        start "RMS - API Gateway (:%GATEWAY_PORT%)" cmd /k "cd /d "%BACKEND_DIR%\%GATEWAY_NAME%" && npm run dev"
        call :WaitForPort %GATEWAY_PORT% "API Gateway"
    )
) else (
    echo [WARNING] API Gateway directory not found: "%BACKEND_DIR%\%GATEWAY_NAME%" - Skipping...
)

echo ===================================================
echo   All 14 RMS microservices are up and running!
echo   API Gateway is listening at: http://localhost:8000
echo   Health Check: http://localhost:8000/health
echo ===================================================
if "%~1"=="--no-pause" goto :end
pause
goto :end

REM ----------------------------------------------------
REM Function: Wait for port to become active (max 30s)
REM ----------------------------------------------------
:WaitForPort
REM %1 = port number
REM %2 = service name
echo Waiting for %~2 to start on port %~1...
set /a ATTEMPTS=0
:CheckPort
netstat -ano | findstr /R /C:":%~1 " >nul
if %errorlevel% equ 0 (
    echo [OK] %~2 is now running on port %~1.
    goto :eof
)
set /a ATTEMPTS+=1
if !ATTEMPTS! geq 30 (
    echo [WARNING] %~2 did not respond on port %~1 within 30s. Continuing...
    goto :eof
)
ping 127.0.0.1 -n 2 >nul
goto CheckPort

:end
