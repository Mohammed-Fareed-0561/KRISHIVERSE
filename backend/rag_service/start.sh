#!/bin/bash
# Start script for RAG service

echo "🌾 Starting KrishiVerse RAG Service..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your configuration"
fi

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Create necessary directories
mkdir -p logs
mkdir -p models/vector_store

# Start the service
echo "Starting RAG service on port ${PORT:-8000}..."
python app.py
