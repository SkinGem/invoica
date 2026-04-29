#!/bin/sh
# Pre-commit secret scanner — refuse commits that introduce plaintext secrets.
#
# Install (run once per clone):
#   ln -sf ../../scripts/pre-commit-secret-scan.sh .git/hooks/pre-commit
#   chmod +x scripts/pre-commit-secret-scan.sh
#
# Patterns deliberately err on the side of false-positives. If you hit a
# legitimate match, redact in the file and re-commit.
#
# History: created 2026-04-29 after the security agent regenerated
# reports/security/incident-2026-04-17-leaked-key-audit.md 5+ times overnight
# with the live revoked API key reinstated (commits 798a158…84c7416).

set -e

# Patterns that should NEVER appear in a commit:
#   sk_ + 64 hex chars         — Invoica founder API key format (sk_<64hex>)
#   sk_test_ / sk_live_ + 60+  — Stripe-style API keys
#   ghp_ + 36 chars            — GitHub classic PAT
#   github_pat_ + 80+          — GitHub fine-grained PAT
#   AIza + 35                  — Google API key
#   xoxb-/xoxa-/xoxp-          — Slack token
#   AKIA + 16                  — AWS access key id
#   $2[ab]$<2 digit>$ + 53     — bcrypt hash (we treat as sensitive)
PATTERNS='(sk_[a-f0-9]{60,})|(sk_(test|live)_[A-Za-z0-9]{40,})|(ghp_[A-Za-z0-9]{36})|(github_pat_[A-Za-z0-9_]{80,})|(AIza[0-9A-Za-z_-]{35})|(xox[bap]-[A-Za-z0-9-]{20,})|(AKIA[0-9A-Z]{16})|(\$2[ab]\$[0-9]{2}\$[./A-Za-z0-9]{53})'

STAGED=$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$STAGED" ] && exit 0

HITS=""
for f in $STAGED; do
  # Skip the scanner itself, package locks, gitignore (acceptable patterns there)
  case "$f" in
    scripts/pre-commit-secret-scan.sh|*lock.json|*.lock|.gitignore) continue ;;
  esac
  [ -f "$f" ] || continue

  # Get only the lines being ADDED in this commit, not the whole file
  added_lines=$(git diff --cached -U0 -- "$f" | grep -E '^\+[^+]' || true)
  [ -z "$added_lines" ] && continue

  match=$(printf '%s\n' "$added_lines" | grep -E "$PATTERNS" || true)
  if [ -n "$match" ]; then
    HITS="$HITS\n=== $f ===\n$match"
  fi
done

if [ -n "$HITS" ]; then
  printf '\n\033[31mPRE-COMMIT BLOCKED — possible secret in staged changes:\033[0m\n'
  printf "$HITS\n"
  printf '\nIf this is a false positive, redact the value (or use a placeholder) and commit again.\n'
  printf 'If this is a real secret: revoke it at the source FIRST, then redact.\n'
  printf 'To bypass (only for confirmed false positives): git commit --no-verify\n\n'
  exit 1
fi

exit 0
