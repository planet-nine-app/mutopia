# Stripe API Key Redaction Guide

## Problem

Stripe test API keys were accidentally committed to git history in commit `c1330975b17ce04e0d23b9629e5d851851a5adb3`.

**Affected Files:**
- `PLATFORM-PAYMENTS.md:198`
- `SEEDING.md:206`
- `SERVICES.md:363`
- `check-account-capabilities.js:15`
- `setup-platform-payout-cards.js:17`
- `update-account-capabilities.js:15`
- `docker-compose.yml:139`

**Keys Found:**
- Secret Key: `sk_test_REDACTED`
- Publishable Key: `pk_test_REDACTED`

## Solution Overview

This guide covers TWO separate steps:

1. **Current Files** - Redact keys from current working directory (✅ DONE)
2. **Git History** - Remove keys from all historical commits (automated script provided)

## Step 1: Current Files (COMPLETED)

All keys in current files have been replaced with `REDACTED`:

```bash
# Verify keys are gone from current files
git grep 'sk_test_8OHG' || echo "✅ Keys successfully removed from working directory!"
```

## Step 2: Git History Redaction

### Prerequisites

Install `git-filter-repo`:

```bash
# macOS (Homebrew)
brew install git-filter-repo

# OR via pip
pip3 install git-filter-repo
```

### Running the Redaction Script

We've provided an automated script that:
- Creates a backup branch
- Rewrites ALL commits to replace keys with `REDACTED`
- Provides clear next steps

**Run the script:**

```bash
cd /Users/zachbabb/Work/planet-nine/mutopia
./redact-stripe-keys.sh
```

**What it does:**

1. Creates backup branch: `backup-before-key-redaction`
2. Uses `git-filter-repo --replace-text` to rewrite history
3. Replaces all occurrences of keys in ALL commits
4. Removes remote references (safety feature of git-filter-repo)

### Manual Method (Alternative)

If you prefer manual control:

```bash
# 1. Create backup
git branch backup-before-key-redaction

# 2. Create replacements file
cat > /tmp/stripe-replacements.txt <<EOF
sk_test_REDACTED==>sk_test_REDACTED
pk_test_REDACTED==>pk_test_REDACTED
EOF

# 3. Run git-filter-repo
git filter-repo --replace-text /tmp/stripe-replacements.txt --force

# 4. Clean up
rm /tmp/stripe-replacements.txt
```

## Verification

After running the redaction:

```bash
# 1. Verify keys are gone from entire history
git log --all --source -S 'sk_test_8OHG' --oneline
# Should return nothing

# 2. Verify working directory is clean
git grep 'sk_test_8OHG' || echo "✅ Success!"

# 3. Check a specific historical commit
git show <old-commit-hash>:docker-compose.yml | grep STRIPE_KEY
# Should show: STRIPE_KEY: sk_test_REDACTED
```

## Force Pushing to Remote

**⚠️ WARNING:** This rewrites history - all commit hashes change!

### If Repository is Private

```bash
# 1. Re-add remote (git-filter-repo removes it for safety)
git remote add origin git@github.com:your-org/mutopia.git

# 2. Force push with lease (safer than --force)
git push --force-with-lease origin main

# 3. If working with collaborators:
# Notify them to fresh clone - their local repos are now divergent!
```

### If Repository is Public

**DO NOT force push to public repos without considering:**

1. **Revoke the exposed keys** in Stripe Dashboard first
2. **Notify users** that history will be rewritten
3. **Consider** whether a fresh repo is better than force push

## Rollback Plan

If something goes wrong:

```bash
# Restore from backup branch
git checkout backup-before-key-redaction

# OR reset to before redaction (if you know the commit hash)
git reset --hard <commit-before-redaction>
```

## Prevention for Future

### 1. Use Environment Variables

**GOOD:**
```yaml
# docker-compose.yml
environment:
  STRIPE_KEY: ${STRIPE_KEY}  # Read from .env file
```

**BAD:**
```yaml
# docker-compose.yml
environment:
  STRIPE_KEY: sk_test_REDACTED  # Hardcoded!
```

### 2. Create .env File

```bash
# .env (gitignored)
STRIPE_KEY=sk_test_REDACTED
STRIPE_PUBLISHABLE_KEY=pk_test_REDACTED
```

### 3. Update .gitignore

```bash
# .gitignore
.env
.env.*
!.env.example
test-platforms.json
test-artists.json
```

### 4. Provide .env.example

```bash
# .env.example (safe to commit)
STRIPE_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

### 5. Use git-secrets

Install and configure git-secrets to prevent future accidents:

```bash
# Install git-secrets
brew install git-secrets

# Setup hooks
cd /Users/zachbabb/Work/planet-nine/mutopia
git secrets --install
git secrets --register-aws

# Add Stripe pattern
git secrets --add 'sk_test_[A-Za-z0-9]{32,}'
git secrets --add 'sk_live_[A-Za-z0-9]{32,}'

# Scan repository
git secrets --scan-history
```

## Key Rotation

Even though these are test keys, best practice is to rotate them:

1. **Login to Stripe Dashboard**: https://dashboard.stripe.com/test/apikeys
2. **Delete the exposed test keys**
3. **Generate new test keys**
4. **Update your local .env file**
5. **Update docker-compose.yml** to use environment variables

## Summary

✅ **Completed:**
- Current files redacted

🔜 **Next Steps:**
1. Run `./redact-stripe-keys.sh` to clean git history
2. Verify keys are gone with `git log -S 'sk_test_8OHG'`
3. Force push to remote if needed
4. Rotate keys in Stripe Dashboard
5. Switch to environment variables for future

## Resources

- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Stripe API Key Security](https://stripe.com/docs/keys#safe-keys)
- [git-secrets on GitHub](https://github.com/awslabs/git-secrets)

## Troubleshooting

### "git-filter-repo: command not found"

Install it:
```bash
brew install git-filter-repo
# OR
pip3 install git-filter-repo
```

### "refusing to overwrite your origin remote"

This is expected! git-filter-repo removes remotes for safety. Re-add it:
```bash
git remote add origin <your-repo-url>
```

### "Updates were rejected because the remote contains work"

You need to force push because history was rewritten:
```bash
git push --force-with-lease origin main
```

### Keys still showing in old commits

Make sure you used `--force` flag:
```bash
git filter-repo --replace-text /tmp/stripe-replacements.txt --force
```

---

**Last Updated:** 2025-11-19
**Status:** Ready to run git history redaction
