@echo off
REM Start script for RAG service on Windows

echo Starting KrishiVerse RAG Service...

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

REM Check if .env exists
if not exist ".env" (
    echo .env file not found. Copying from .env.example...
    copy .env.example .env
    echo Please edit .env file with your configuration
)

REM Install dependencies if needed
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Create necessary directories
if not exist "logs" mkdir logs
if not exist "models\vector_store" mkdir models\vector_store

REM Start the service
echo Starting RAG service on port 8000...
python app.py
