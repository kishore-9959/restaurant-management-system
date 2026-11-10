@echo off
set "SCRIPT_DIR=%~dp0"

echo ===================================================
echo   Restaurant Management System (RMS)
echo   Restarting All 14 Microservices & API Gateway
echo ===================================================

call "%SCRIPT_DIR%stop-all.bat"
ping 127.0.0.1 -n 3 >nul
call "%SCRIPT_DIR%start-all.bat"

