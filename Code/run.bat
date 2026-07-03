@echo off
:: Change directory to the folder containing this batch script
cd /d "%~dp0"

echo Starting VITALS Edge and LeakSense Twin Services...

:: Start the Python FastAPI backend in a separate terminal window
echo Starting backend server on http://localhost:8000...
start "VITALS Edge Backend" cmd /k "cd backend && python main.py"

:: Start the React Vite frontend server in a separate terminal window
echo Starting frontend server on http://localhost:5173...
start "VITALS Edge Frontend" cmd /k "cd frontend && node node_modules\vite\bin\vite.js"

:: Wait for services to initialize using silent ping delay
echo Waiting for servers to initialize...
ping 127.0.0.1 -n 4 > nul

:: Open the default browser to the frontend dashboard
echo Opening dashboard in default web browser...
start http://localhost:5173/

echo Services started successfully!
