# Simple RAG Service Test Script
# Run this after starting python app.py

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Testing RAG Service" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "[1/3] Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    Write-Host "✓ Health Check Passed" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor Cyan
    Write-Host "  Documents Loaded: $($health.documents_loaded)" -ForegroundColor Cyan
    Write-Host "  Vector Store Ready: $($health.vector_store_ready)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Health Check Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host "  Is the RAG service running? Start with: python app.py" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

Write-Host "[2/3] Testing Disease Query..." -ForegroundColor Yellow
try {
    $body = @{
        question = "How to treat late blight in potato?"
        language = "en"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:8000/rag/ask" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"

    Write-Host "✓ Disease Query Successful" -ForegroundColor Green
    Write-Host "  Answer Preview:" -ForegroundColor Cyan
    $preview = $response.answer.Substring(0, [Math]::Min(200, $response.answer.Length))
    Write-Host "  $preview..." -ForegroundColor White
    Write-Host "  Confidence: $($response.confidence)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Disease Query Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "[3/3] Testing Irrigation Query..." -ForegroundColor Yellow
try {
    $body = @{
        question = "What is the irrigation schedule for rice?"
        language = "en"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:8000/rag/ask" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"

    Write-Host "✓ Irrigation Query Successful" -ForegroundColor Green
    Write-Host "  Answer Preview:" -ForegroundColor Cyan
    $preview = $response.answer.Substring(0, [Math]::Min(200, $response.answer.Length))
    Write-Host "  $preview..." -ForegroundColor White
    Write-Host "  Confidence: $($response.confidence)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Irrigation Query Failed" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  RAG Service Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: cd ..\.. && npm start" -ForegroundColor White
Write-Host "2. Start frontend: cd ..\..\krishiverse && npm run dev" -ForegroundColor White
Write-Host "3. Open: http://localhost:5173/ask" -ForegroundColor White
Write-Host ""
