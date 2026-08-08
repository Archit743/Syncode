$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Forwarding to start-dev.ps1..."
& (Join-Path $scriptRoot "start-dev.ps1")
