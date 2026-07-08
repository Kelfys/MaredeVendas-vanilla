# Login, link e db push — rode no PowerShell interativo:
#   .\tools\supabase-setup.ps1
Set-Location $PSScriptRoot\..

Write-Host '1/3 supabase login (abre o navegador)...' -ForegroundColor Cyan
npx supabase login
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '2/3 supabase link...' -ForegroundColor Cyan
npx supabase link --project-ref ulpjsxmilumqedkkfuqw
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '3/3 supabase db push...' -ForegroundColor Cyan
npx supabase db push
exit $LASTEXITCODE