# make-shortcut.ps1 - creates a desktop shortcut that launches the game.
#
# Usage:  powershell -ExecutionPolicy Bypass -File tools\make-shortcut.ps1
#
# The Hebrew name is built from code points so the script stays pure ASCII
# and works regardless of how Windows PowerShell 5.1 decodes the file.

$root    = Split-Path -Parent $PSScriptRoot
$target  = Join-Path $root 'play.bat'
$icon    = Join-Path $root 'assets\icon.ico'
$desktop = [Environment]::GetFolderPath('Desktop')

# "bonei hamikdash" in Hebrew
$codes = 0x05D1,0x05D5,0x05E0,0x05D4,0x20,0x05D4,0x05DE,0x05E7,0x05D3,0x05E9
$name  = -join ($codes | ForEach-Object { [char]$_ })

$finalPath = Join-Path $desktop ($name + '.lnk')

# WScript.Shell converts the path to ANSI, so a Hebrew name becomes '????' and
# Save() fails. Create it under an ASCII name first, then rename (Unicode-safe).
$lnkPath = Join-Path $desktop 'TempleBuilder.lnk'

$shell = New-Object -ComObject WScript.Shell
$lnk   = $shell.CreateShortcut($lnkPath)

$lnk.TargetPath       = $target
$lnk.WorkingDirectory = $root
$lnk.IconLocation     = "$icon,0"
$lnk.WindowStyle      = 7          # minimized: hides the launcher's console window
$lnk.Description      = 'Temple Builder'
$lnk.Save()

if (-not (Test-Path -LiteralPath $lnkPath)) {
    Write-Error "Shortcut was not created"
    exit 1
}

# replace any previous copy, then give it the Hebrew name
if (Test-Path -LiteralPath $finalPath) { Remove-Item -LiteralPath $finalPath -Force }
Rename-Item -LiteralPath $lnkPath -NewName ($name + '.lnk')

if (Test-Path -LiteralPath $finalPath) {
    Write-Output "Created shortcut on desktop (Hebrew name, $($name.Length) chars)"
} else {
    Write-Error "Rename failed"
    exit 1
}
