param(
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"
$repoDir = "C:\Users\Alfa\Desktop\hermes_agent"
$sshKey = "$env:USERPROFILE\.ssh\hermes-key.pem"
$remoteHost = "ubuntu@51.21.254.184"
$remoteDir = "~/hermes-agent"

Write-Host "=== Syncing local work to production bot ===" -ForegroundColor Cyan

# 1. Commit
Set-Location -LiteralPath $repoDir
if ($Message -eq "") {
    $Message = Read-Host "Commit message"
}
git add -A
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "Nothing to commit or commit failed." -ForegroundColor Yellow
}

# 2. Push
Write-Host "`nPushing to GitHub..." -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed. Check your connection." -ForegroundColor Red
    exit 1
}

# 3. Deploy to EC2
Write-Host "`nDeploying to production EC2..." -ForegroundColor Cyan
ssh -i $sshKey $remoteHost "cd $remoteDir && git pull && sudo systemctl restart hermes-gateway && sudo systemctl status hermes-gateway --no-pager"
if ($LASTEXITCODE -ne 0) {
    Write-Host "EC2 deployment failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Sync complete! Bot is live with your changes. ===" -ForegroundColor Green
