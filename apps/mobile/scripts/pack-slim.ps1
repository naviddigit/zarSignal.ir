# Creates a minimal mobile source zip (no node_modules / .expo / secrets).
$ErrorActionPreference = 'Stop'
$mobile = Split-Path $PSScriptRoot -Parent
$outZip = Join-Path ([Environment]::GetFolderPath('Desktop')) 'ZarSignal-Mobile-Slim.zip'
$staging = Join-Path $env:TEMP ('zs-mobile-slim-' + [guid]::NewGuid().ToString('N'))

if (-not (Test-Path (Join-Path $mobile 'package.json'))) { throw "Mobile app not found: $mobile" }

New-Item -ItemType Directory -Path $staging | Out-Null
try {
  $robolog = Join-Path $env:TEMP 'zs-mobile-slim-robo.log'
  & robocopy $mobile $staging /E /XD node_modules .expo dist web-build .git /XF .env *.log /NFL /NDL /NJH /NJS /nc /ns /np | Out-File $robolog
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed with code $LASTEXITCODE" }

  if (Test-Path $outZip) { Remove-Item $outZip -Force }
  Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $outZip -Force

  $bytes = (Get-Item $outZip).Length
  Write-Output ("SLIM_ZIP={0}" -f $outZip)
  Write-Output ("SLIM_KB={0:N1}" -f ($bytes / 1KB))
  Write-Output 'Excluded: node_modules, .expo, dist, .env, logs'
}
finally {
  Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
}
