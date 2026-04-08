$ErrorActionPreference = "Stop"

# Config
$workspace = "D:\jiovio"
$frontendDir = Join-Path $workspace "frontend"
$pythonExe = "d:/jiovio/.venv/Scripts/python.exe"
$databaseUrl = "mysql+pymysql://stress_user:StressApp123@127.0.0.1:3306/stress_app?charset=utf8mb4"
$apiPort = 8010
$uiPort = 3000

Write-Host "Checking backend on http://127.0.0.1:$apiPort/health ..."
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -Method Get
    Write-Host "Backend already running. DB connected:" $health.database_connected
} catch {
    Write-Host "Starting backend..."
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "`$env:DATABASE_URL='$databaseUrl'; cd '$workspace'; & '$pythonExe' -m uvicorn app:app --host 127.0.0.1 --port $apiPort"
    ) | Out-Null

    Start-Sleep -Seconds 3
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -Method Get
        Write-Host "Backend started. DB connected:" $health.database_connected
    } catch {
        Write-Host "Backend failed to start on port $apiPort."
        throw
    }
}

Write-Host "Checking frontend on http://127.0.0.1:$uiPort ..."
try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$uiPort" -UseBasicParsing
    Write-Host "Frontend already running (HTTP" $resp.StatusCode ")"
} catch {
    Write-Host "Starting frontend..."
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$frontendDir'; npm start"
    ) | Out-Null

    Start-Sleep -Seconds 8
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$uiPort" -UseBasicParsing
        Write-Host "Frontend started (HTTP" $resp.StatusCode ")"
    } catch {
        Write-Host "Frontend failed to start on port $uiPort."
        throw
    }
}

Write-Host "\nApp is ready:"
Write-Host "- Frontend: http://127.0.0.1:$uiPort"
Write-Host "- Backend : http://127.0.0.1:$apiPort"
Write-Host "- API docs: http://127.0.0.1:$apiPort/docs"
