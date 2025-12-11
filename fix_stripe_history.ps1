# PowerShell script to fix Stripe keys in Git history
# This will rewrite the commit 9601c4c to remove Stripe keys

Write-Host "Starting Git history cleanup for Stripe keys..." -ForegroundColor Yellow

# Checkout the problematic commit
git checkout 9601c4c

# Remove the files with keys
if (Test-Path STRIPE_INTEGRATION.md) { Remove-Item STRIPE_INTEGRATION.md -Force }
if (Test-Path STRIPE_QUICK_REFERENCE.md) { Remove-Item STRIPE_QUICK_REFERENCE.md -Force }
if (Test-Path STRIPE_QUICK_SETUP.md) { Remove-Item STRIPE_QUICK_SETUP.md -Force }
if (Test-Path STRIPE_SETUP_COMPLETE.md) { Remove-Item STRIPE_SETUP_COMPLETE.md -Force }

# Stage the deletion
git add STRIPE_*.md 2>$null

# Amend the commit
git commit --amend --no-edit

# Go back to main
git checkout main

Write-Host "✅ Commit 9601c4c has been fixed. Now you need to rebase the later commits." -ForegroundColor Green
Write-Host "Run: git rebase 9601c4c" -ForegroundColor Cyan

