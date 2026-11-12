# shot.ps1 - takes a screenshot of the running game in headless Edge.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File tools\shot.ps1 -Name play -Query "?start=play&px=1700"
#   ... -Scale 3 -Crop "180,1260,300,300"     (zoom x3, then crop x,y,w,h in output pixels)
#
# The game server must be running (play.bat). Output: tmp\<Name>.png (and <Name>_crop.png).
# Each run is killed after $TimeoutSec so a hung browser can't block the caller.

param(
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$Query = "",
  [int]$Budget = 5000,
  [int]$TimeoutSec = 40,
  [double]$Scale = 1,
  [string]$Crop = ""
)

$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root "tmp\$Name.png"
New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
if (Test-Path $out) { Remove-Item $out -Force }

$edge = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) { $edge = Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe' }

# separate profile dir so a running Edge instance does not swallow the command
$profile = Join-Path $env:TEMP ("tb_shot_" + [guid]::NewGuid().ToString('N').Substring(0, 8))

$edgeArgs = @(
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--window-size=1280,720', "--virtual-time-budget=$Budget",
  "--force-device-scale-factor=$Scale",
  "--user-data-dir=$profile", "--screenshot=$out",
  "http://localhost:8080/$Query"
)

$p = Start-Process -FilePath $edge -ArgumentList $edgeArgs -PassThru -WindowStyle Hidden
if (-not $p.WaitForExit($TimeoutSec * 1000)) {
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  Write-Output "TIMEOUT after $TimeoutSec s"
}

# headless Edge may spawn children that outlive the parent
Start-Sleep -Milliseconds 500
Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" |
  Where-Object { $_.CommandLine -like "*$profile*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue

if (-not (Test-Path $out)) { Write-Output "FAILED $Name"; return }

if ($Crop) {
  Add-Type -AssemblyName System.Drawing
  $c = $Crop.Split(',') | ForEach-Object { [int]$_ }
  $src = [System.Drawing.Bitmap]::FromFile($out)
  $rect = New-Object System.Drawing.Rectangle($c[0], $c[1], $c[2], $c[3])
  $dst = $src.Clone($rect, $src.PixelFormat)
  $cropOut = Join-Path $root "tmp\${Name}_crop.png"
  $dst.Save($cropOut, [System.Drawing.Imaging.ImageFormat]::Png)
  $dst.Dispose(); $src.Dispose()
  Write-Output "OK $Name ($((Get-Item $out).Length) bytes), crop -> ${Name}_crop.png"
} else {
  Write-Output "OK $Name ($((Get-Item $out).Length) bytes)"
}
