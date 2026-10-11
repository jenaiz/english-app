#!/usr/bin/env bash
# Download a pg_dump of the production database (custom format) to ./db-backups/.
# Useful as a manual backup and to move the data to another server:
#   pg_restore -d "postgres://user:pass@host/english_app" --no-owner --no-acl <file>
#
# Same environment overrides as deploy.sh (DEPLOY_SSH, DEPLOY_SSH_KEY, DEPLOY_REMOTE_DIR).
set -euo pipefail

cd "$(dirname "$0")/.."

SSH_TARGET="${DEPLOY_SSH:-deploy@bukios.com}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/bukios_deploy}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/home/deploy/fluently}"

mkdir -p db-backups
out="db-backups/fluently_$(date +%Y%m%d_%H%M%S).dump"
ssh -i "$SSH_KEY" "$SSH_TARGET" \
  "cd '$REMOTE_DIR' && docker compose exec -T postgres pg_dump -U english -d english_app -Fc --no-owner --no-acl" > "$out"
echo "💾 $out ($(du -h "$out" | cut -f1))"
