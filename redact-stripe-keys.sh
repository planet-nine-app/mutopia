#!/bin/bash

# Script to redact Stripe API keys from git history
# WARNING: This rewrites git history - use with caution!

echo "═══════════════════════════════════════════════"
echo "  REDACTING STRIPE KEYS FROM GIT HISTORY"
echo "═══════════════════════════════════════════════"
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  All commit hashes will change!"
echo "⚠️  You will need to force push if already pushed to remote!"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Creating backup branch..."
git branch backup-before-key-redaction 2>/dev/null || true
echo "✅ Backup created at: backup-before-key-redaction"

echo ""
echo "Step 2: Running git filter-repo to redact keys..."
echo ""

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ git-filter-repo not found!"
    echo ""
    echo "Please install it first:"
    echo "  pip3 install git-filter-repo"
    echo "  OR"
    echo "  brew install git-filter-repo"
    echo ""
    exit 1
fi

# Create replacements file
cat > /tmp/stripe-key-replacements.txt <<EOF
sk_test_REDACTED==>sk_test_REDACTED
pk_test_REDACTED==>pk_test_REDACTED
EOF

# Run git-filter-repo to replace keys in ALL commits
git filter-repo --replace-text /tmp/stripe-key-replacements.txt --force

# Clean up
rm /tmp/stripe-key-replacements.txt

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ REDACTION COMPLETE"
echo "═══════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  - All Stripe keys replaced with 'REDACTED' in entire history"
echo "  - Backup branch created: backup-before-key-redaction"
echo ""
echo "Next steps:"
echo ""
echo "1. Verify the changes:"
echo "   git log --all --oneline | head -20"
echo "   git grep 'sk_test_8OHG' || echo 'Keys successfully removed!'"
echo ""
echo "2. If pushed to remote, you MUST force push:"
echo "   git remote add origin <url>  # Re-add remote (filter-repo removes it)"
echo "   git push --force-with-lease origin main"
echo ""
echo "3. If working with collaborators:"
echo "   - Notify them to re-clone the repository"
echo "   - Old clones will have divergent history"
echo ""
echo "4. To restore from backup if needed:"
echo "   git checkout backup-before-key-redaction"
echo ""
