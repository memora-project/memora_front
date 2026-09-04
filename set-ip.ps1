# set-ip.ps1
# .env의 API_BASE_URL을 시연/개발 환경에 맞게 갱신.
#
# 사용법:
#   .\set-ip.ps1                  → 폰 시연 (현재 노트북 LAN IP 자동 감지) [기본]
#   .\set-ip.ps1 -Target phone    → 동일 (명시적)
#   .\set-ip.ps1 -Target emulator → 에뮬레이터 테스트 (10.0.2.2 = QEMU NAT)
#
# 왜 분기가 필요?
#   - 에뮬레이터는 QEMU NAT 안에 갇혀있어서 호스트 LAN IP에 못 닿음. 10.0.2.2(NAT 게이트웨이)로만 호스트 접근 가능.
#   - 실물 폰은 같은 wifi의 다른 기기와 통신하니까 LAN IP로 접근.

param(
    [ValidateSet("phone", "emulator")]
    [string]$Target = "phone"
)

$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Error ".env 파일이 없습니다: $envPath"
    exit 1
}

if ($Target -eq "emulator") {
    $apiUrl = "http://10.0.2.2:8080/api/v1"
    $targetMsg = "에뮬레이터 (QEMU NAT)"
} else {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.PrefixOrigin -in @('Dhcp', 'Manual') -and
            $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and
            $_.InterfaceAlias -notmatch '(Loopback|vEthernet|VMware|VirtualBox|WSL|Hyper-V)'
        }
    if (-not $candidates) {
        Write-Error "유효한 LAN IP를 찾지 못했습니다. wifi 연결 상태를 확인하세요."
        exit 1
    }
    $ip = ($candidates | Sort-Object -Property ValidLifetime | Select-Object -First 1).IPAddress
    $apiUrl = "http://${ip}:8080/api/v1"
    $targetMsg = "실물 폰 (LAN IP $ip)"
}

$content = Get-Content $envPath -Raw
$newContent = $content -replace 'API_BASE_URL=.*', "API_BASE_URL=$apiUrl"

Set-Content -Path $envPath -Value $newContent -NoNewline

Write-Host "✓ API_BASE_URL 갱신됨: $apiUrl" -ForegroundColor Green
Write-Host "   대상: $targetMsg" -ForegroundColor Gray
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Yellow
Write-Host "  1. Metro 창에서 Ctrl+C → npx react-native start --host 0.0.0.0"
Write-Host "  2. 앱 강제 종료 후 다시 열기 (또는 R 두 번)"
