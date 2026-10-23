#Requires -RunAsAdministrator
<#
  Ajusta o PostgreSQL instalado no Windows para aceitar a URL do .env de desenvolvimento:
  postgresql://postgres:postgres@localhost:5432/cobranca_condominial

  Uso (PowerShell como Administrador, na raiz do projeto):
    npm run db:windows-bootstrap

  O script ativa trust só em localhost por alguns segundos, define a senha, cria o banco e restaura pg_hba.conf.
#>

$ErrorActionPreference = "Stop"

$ServiceName = "postgresql-x64-18"
$DataDir = "C:\Program Files\PostgreSQL\18\data"
$HbaPath = Join-Path $DataDir "pg_hba.conf"
$Psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$BackupPath = "$HbaPath.backup-cobranca-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$DevPassword = "postgres"
$DatabaseName = "cobranca_condominial"

if (-not (Test-Path $Psql)) {
  Write-Error "psql não encontrado em $Psql. Ajuste a versão do PostgreSQL no script ou use Docker (npm run db:up)."
}

if (-not (Test-Path $HbaPath)) {
  Write-Error "pg_hba.conf não encontrado em $HbaPath."
}

$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $service) {
  Write-Error "Serviço $ServiceName não encontrado. Verifique o nome em services.msc."
}

function Invoke-Psql([string]$Sql) {
  & $Psql -U postgres -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 -c $Sql
}

Write-Host "Backup de pg_hba.conf -> $BackupPath"
Copy-Item $HbaPath $BackupPath

Write-Host "Ativando trust temporário em localhost..."
$hba = Get-Content $HbaPath -Raw
$hbaTrust = $hba -replace "scram-sha-256", "trust"
Set-Content -Path $HbaPath -Value $hbaTrust -Encoding utf8NoBOM

Restart-Service $ServiceName
Start-Sleep -Seconds 2

try {
  Write-Host "Definindo senha do usuário postgres..."
  Invoke-Psql "ALTER USER postgres WITH PASSWORD '$DevPassword';"

  $dbExists = & $Psql -U postgres -h 127.0.0.1 -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';"
  if ($dbExists.Trim() -ne "1") {
    Write-Host "Criando banco $DatabaseName..."
    Invoke-Psql "CREATE DATABASE $DatabaseName;"
  } else {
    Write-Host "Banco $DatabaseName já existe."
  }
} finally {
  Write-Host "Restaurando pg_hba.conf (scram-sha-256)..."
  Copy-Item $BackupPath $HbaPath -Force
  Restart-Service $ServiceName
}

Write-Host ""
Write-Host "Pronto. No .env use:"
Write-Host "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/$DatabaseName"
Write-Host ""
Write-Host "Depois: npm run db:migrate && npm run db:seed"
