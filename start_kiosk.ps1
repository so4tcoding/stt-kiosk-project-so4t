Write-Host "키오스크 서버 시작 중..." -ForegroundColor Cyan
Start-Job {
    Start-Sleep -Seconds 3
    Start-Process "http://127.0.0.1:8000/kiosk.html"
} | Out-Null
python -m uvicorn stt_server:app --host 127.0.0.1 --port 8000
