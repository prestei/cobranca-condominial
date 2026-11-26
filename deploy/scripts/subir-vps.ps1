# Assistente de deploy no Windows: só IP + senha SSH.
# Uso: .\deploy\scripts\subir-vps.ps1
#      .\deploy\scripts\subir-vps.ps1 -Host 203.0.113.10 -Password 'sua-senha'

param(
    [Alias("Ip", "Host")]
    [string]$VpsHost,
    [Alias("Senha")]
    [string]$Password,
    [string]$Domain = "danieljorgeadv.com"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $Root

$py = @("py", "-3")
if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    $py = @("python")
}

& @py @("-m", "pip", "install", "-q", "-r", "deploy/requirements-deploy.txt") | Out-Null

$argsList = @("deploy/scripts/subir-vps.py", "--domain", $Domain)
if ($VpsHost) { $argsList += @("--host", $VpsHost) }
if ($Password) { $argsList += @("--password", $Password) }

& @py @argsList
exit $LASTEXITCODE