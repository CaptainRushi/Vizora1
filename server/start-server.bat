@echo off
echo ========================================
echo Vizora Backend Server Startup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Checking dependencies...
if not exist "node_modules\" (
    echo Dependencies not found. Installing...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo Dependencies OK
)

echo.
echo [2/3] Checking environment variables...
if not exist ".env" (
    echo WARNING: .env file not found
    echo Please create .env with:
    echo   SUPABASE_URL=your_url
    echo   SUPABASE_SERVICE_ROLE_KEY=your_key
    echo   OPENAI_API_KEY=your_key
    echo.
    pause
)

echo.
echo [3/3] Starting server...
echo Server will run on http://localhost:3001
echo Press Ctrl+C to stop
echo.

npm start
