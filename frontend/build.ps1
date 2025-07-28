#!/usr/bin/env pwsh
# Script لبناء APK

Set-Location "d:\margerges database\frontend"
Write-Host "Current directory: $(Get-Location)"
Write-Host "Checking if app.json exists: $(Test-Path './app.json')"

npx eas build --platform android --profile preview
