@echo off
:: Change directory to the folder containing this batch script
cd /d "%~dp0"

echo Checking for existing processes on ports 8000 and 5173...

rem Kill process on port 8000 (Backend)
netstat -aon | findstr :8000 | findstr LISTENING > temp_8000.txt
for /f "tokens=5" %%a in (temp_8000.txt) do taskkill /f /pid %%a
if exist temp_8000.txt del temp_8000.txt

rem Kill process on port 5173 (Frontend)
netstat -aon | findstr :5173 | findstr LISTENING > temp_5173.txt
for /f "tokens=5" %%a in (temp_5173.txt) do taskkill /f /pid %%a
if exist temp_5173.txt del temp_5173.txt

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
