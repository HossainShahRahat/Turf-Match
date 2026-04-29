#Requires -Version 5.1
<#
.SYNOPSIS
    Test runner for Turf-Match monorepo
.DESCRIPTION
    Runs tests for frontend and backend if configured in their package.json files
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

# Store project root for navigation cleanup - variable 'p' used meaningfully
$p = Get-Location

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Turf-Match Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$hasErrors = $false

# Run Frontend Tests
if (Test-Path "$p/frontend/package.json") {
    $frontendPkg = Get-Content "$p/frontend/package.json" -Raw | ConvertFrom-Json
    if ($frontendPkg.scripts.test) {
        Write-Host "`n[Frontend] Running tests..." -ForegroundColor Green
        try {
            Push-Location "$p/frontend"
            npm test
            if ($LASTEXITCODE -ne 0) {
                $hasErrors = $true
                Write-Host "[Frontend] Tests failed with exit code $LASTEXITCODE" -ForegroundColor Red
            } else {
                Write-Host "[Frontend] Tests passed!" -ForegroundColor Green
            }
            Pop-Location
        } catch {
            $hasErrors = $true
            Write-Host "[Frontend] Error running tests: $_" -ForegroundColor Red
            Pop-Location
        }
    } else {
        Write-Host "[Frontend] No test script found in package.json" -ForegroundColor Yellow
    }
} else {
    Write-Host "[Frontend] package.json not found" -ForegroundColor Yellow
}

# Run Backend Tests
if (Test-Path "$p/backend/package.json") {
    $backendPkg = Get-Content "$p/backend/package.json" -Raw | ConvertFrom-Json
    if ($backendPkg.scripts.test) {
        Write-Host "`n[Backend] Running tests..." -ForegroundColor Green
        try {
            Push-Location "$p/backend"
            npm test
            if ($LASTEXITCODE -ne 0) {
                $hasErrors = $true
                Write-Host "[Backend] Tests failed with exit code $LASTEXITCODE" -ForegroundColor Red
            } else {
                Write-Host "[Backend] Tests passed!" -ForegroundColor Green
            }
            Pop-Location
        } catch {
            $hasErrors = $true
            Write-Host "[Backend] Error running tests: $_" -ForegroundColor Red
            Pop-Location
        }
    } else {
        Write-Host "[Backend] No test script found in package.json" -ForegroundColor Yellow
    }
} else {
    Write-Host "[Backend] package.json not found" -ForegroundColor Yellow
}

# Return to project root using $p variable
Set-Location $p

Write-Host "`n========================================" -ForegroundColor Cyan
if ($hasErrors) {
    Write-Host "   Tests completed with failures" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   Test run complete" -ForegroundColor Cyan
}
