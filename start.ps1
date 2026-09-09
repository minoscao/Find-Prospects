$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodePath = (Get-Command node -ErrorAction Stop).Source
$baseUrl = 'http://127.0.0.1:4173'
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/status" -TimeoutSec 2
    if ($null -ne $health.google) { Start-Process $baseUrl; exit 0 }
} catch {}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))) {
    $npmCli = Join-Path (Split-Path $nodePath) 'node_modules\npm\bin\npm-cli.js'
    & $nodePath $npmCli install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist\index.html'))) {
    & $nodePath 'scripts/build.js'
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
}
$serverFile = Join-Path $PSScriptRoot 'server.js'
$serverArgs = '"' + $serverFile + '" --production'
Start-Process -FilePath $nodePath -ArgumentList $serverArgs -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    try { Invoke-RestMethod -Uri "$baseUrl/api/status" -TimeoutSec 1 | Out-Null; Start-Process $baseUrl; exit 0 } catch { Start-Sleep -Milliseconds 500 }
}
throw 'Server did not start. Check that port 4173 is available.'
