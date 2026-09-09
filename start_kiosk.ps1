Write-Host "키오스크 로컬 서버 세팅 중..." -ForegroundColor Cyan
Start-Job {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:8000/kiosk.html"
} | Out-Null
python -m http.server 8000
