# Updates API_BASE_URL in .env. Run from any directory.
# Local emulator: .\set-ip.ps1 -Target emulator
# Local phone:    .\set-ip.ps1 -Target phone
# Render:         .\set-ip.ps1 -Target render -BaseUrl https://your-service.onrender.com

param(
    [ValidateSet("phone", "emulator", "render")]
    [string]$Target = "phone",
    [string]$BaseUrl = ""
)

$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path -LiteralPath $envPath)) {
    Write-Error ".env file was not found: $envPath"
    exit 1
}

if ($Target -eq "render") {
    $renderUri = $null
    if (-not [Uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$renderUri) -or
        $renderUri.Scheme -ne "https" -or
        -not $renderUri.Host -or
        $renderUri.AbsolutePath -ne "/" -or
        $renderUri.Query -or
        $renderUri.Fragment -or
        $renderUri.UserInfo) {
        Write-Error "Pass the HTTPS service origin only, e.g. https://memora-api.onrender.com"
        exit 1
    }
    $apiUrl = $BaseUrl.TrimEnd('/') + "/api/v1"
    $targetMsg = "Render backend"
} elseif ($Target -eq "emulator") {
    $adbPath = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
    if (-not (Test-Path -LiteralPath $adbPath)) {
        Write-Error "ADB was not found: $adbPath"
        exit 1
    }
    & $adbPath -e reverse tcp:8080 tcp:8080
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ADB reverse failed. Check that an emulator is running."
        exit 1
    }
    $apiUrl = "http://127.0.0.1:8080/api/v1"
    $targetMsg = "local emulator via ADB reverse"
} else {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.PrefixOrigin -in @('Dhcp', 'Manual') -and
            $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and
            $_.InterfaceAlias -notmatch '(Loopback|vEthernet|VMware|VirtualBox|WSL|Hyper-V)'
        }
    if (-not $candidates) {
        Write-Error "No usable LAN IPv4 address was found."
        exit 1
    }
    $ip = ($candidates | Sort-Object -Property ValidLifetime | Select-Object -First 1).IPAddress
    $apiUrl = "http://${ip}:8080/api/v1"
    $targetMsg = "local phone on LAN $ip"
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$content = [System.IO.File]::ReadAllText($envPath, $utf8)
if ($content -notmatch '(?m)^API_BASE_URL=') {
    Write-Error ".env does not contain API_BASE_URL."
    exit 1
}
$newContent = $content -replace '(?m)^API_BASE_URL=.*$', "API_BASE_URL=$apiUrl"
[System.IO.File]::WriteAllText($envPath, $newContent, $utf8)

Write-Host "API_BASE_URL updated: $apiUrl" -ForegroundColor Green
Write-Host "Target: $targetMsg" -ForegroundColor Gray
Write-Host "Restart Metro with --reset-cache and rebuild the Android app." -ForegroundColor Yellow
