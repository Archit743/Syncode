$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptRoot "backend"
$frontendDir = Join-Path $scriptRoot "frontend"

Write-Host "Starting Syncode Agentic Showcase (V2)..." -ForegroundColor Cyan

# Clear conflicting process on backend port (common when legacy backend is still running)
$existingConn = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue
if ($existingConn) {
    $ownerPid = $existingConn.OwningProcess
    try {
        $ownerProc = Get-Process -Id $ownerPid -ErrorAction Stop
        Write-Host "Stopping process on port 8765: $($ownerProc.ProcessName) (PID $ownerPid)" -ForegroundColor Yellow
        Stop-Process -Id $ownerPid -Force -ErrorAction Stop
    }
    catch {
        Write-Host "Could not stop existing process on port 8765 (PID $ownerPid). Continuing anyway." -ForegroundColor Yellow
    }
}

# Start Backend
Write-Host "Starting FastAPI Backend on port 8765..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath "uvicorn" -ArgumentList "app.main:app", "--host", "127.0.0.1", "--port", "8765", "--reload" -WorkingDirectory $backendDir -PassThru -NoNewWindow

# Wait a moment for backend to initialize
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Vite Frontend..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $frontendDir -PassThru -NoNewWindow

Write-Host "Both servers started. Press Ctrl+C to stop." -ForegroundColor Yellow

try {
    # Keep script running to maintain processes
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "Shutting down servers..." -ForegroundColor Cyan
    if ($backendProcess -and !$backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Done." -ForegroundColor Green
}
