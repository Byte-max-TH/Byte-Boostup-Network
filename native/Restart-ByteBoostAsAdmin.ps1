[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ExecutablePath,
    [Parameter(Mandatory = $true)][string]$AppPath,
    [Parameter(Mandatory = $true)][ValidateSet('True', 'False')][string]$Packaged
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
    throw 'BYTE BOOST executable was not found.'
}

if ($Packaged -eq 'True') {
    Start-Process -FilePath $ExecutablePath -Verb RunAs | Out-Null
} else {
    if (-not (Test-Path -LiteralPath $AppPath)) {
        throw 'BYTE BOOST application path was not found.'
    }
    Start-Process -FilePath $ExecutablePath -ArgumentList @($AppPath) -Verb RunAs | Out-Null
}
