#!/bin/bash
# Script to remove Stripe API keys from Git history

git filter-branch --force --index-filter '
git rm --cached --ignore-unmatch STRIPE_INTEGRATION.md STRIPE_QUICK_REFERENCE.md STRIPE_QUICK_SETUP.md STRIPE_SETUP_COMPLETE.md 2>/dev/null || true
' --prune-empty --tag-name-filter cat -- --all

# Clean up backup refs
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d 2>/dev/null || true

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ Git history cleaned. Stripe keys removed from all commits."

