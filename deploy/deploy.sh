#!/usr/bin/env bash
# One-command deploy of Fluently to the bukios VPS: bump the version, build the
# amd64 images, ship them over SSH (no registry), start them with compose,
# validate /api/health and push the version commit + tag.
#
# Usage:
#   ./deploy/deploy.sh            # bump patch (0.1.0 -> 0.1.1) and deploy
#   ./deploy/deploy.sh --minor    # 0.1.0 -> 0.2.0
#   ./deploy/deploy.sh --major    # 0.1.0 -> 1.0.0
#   ./deploy/deploy.sh --no-bump  # redeploy the current version (retry a deploy)
#   ./deploy/deploy.sh --minor -y # skip the confirmation prompt
#
# Overridable via environment:
#   DEPLOY_SSH         (default deploy@bukios.com)
#   DEPLOY_SSH_KEY     (default ~/.ssh/bukios_deploy)
#   DEPLOY_REMOTE_DIR  (default /home/deploy/fluently)
#   DEPLOY_DOMAIN      (default fluently.bukios.com — see deploy/README.md to change it)
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION_FILE="deploy/VERSION"
SSH_TARGET="${DEPLOY_SSH:-deploy@bukios.com}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/bukios_deploy}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/home/deploy/fluently}"
DOMAIN="${DEPLOY_DOMAIN:-fluently.bukios.com}"
HEALTH_URL="https://$DOMAIN/api/health"

# --- Parse args: one bump flag (optional) + optional -y/--yes ---
bump="--patch"
assume_yes=0
for arg in "$@"; do
  case "$arg" in
    --major|--minor|--patch|--no-bump) bump="$arg" ;;
    -y|--yes) assume_yes=1 ;;
    *) echo "Unknown option: $arg (use --major/--minor/--patch/--no-bump [-y])"; exit 1 ;;
  esac
done

current=$(cat "$VERSION_FILE")
IFS='.' read -r major minor patch <<< "$current"
case "$bump" in
  --major)   version="$((major + 1)).0.0" ;;
  --minor)   version="$major.$((minor + 1)).0" ;;
  --patch)   version="$major.$minor.$((patch + 1))" ;;
  --no-bump) version="$current" ;;
esac

ssh_cmd() { ssh -i "$SSH_KEY" "$SSH_TARGET" "$@"; }

echo "🚀 Deploy Fluently"
if [[ "$bump" == "--no-bump" ]]; then
  echo "   version:  $version   (redeploy, no bump)"
else
  echo "   version:  $current → $version   (bump: $bump)"
  echo "   git tag:  v$version"
fi
echo "   target:   $SSH_TARGET:$REMOTE_DIR"
echo "   health:   $HEALTH_URL"
if [[ "$assume_yes" -ne 1 ]]; then
  read -r -p "Deploy version $version? [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]] || { echo "Aborted."; exit 1; }
fi

# --- 1) Bump version + commit + tag (skipped on --no-bump) ---
if [[ "$bump" != "--no-bump" ]]; then
  if [[ -n "$(git status --porcelain -- . ':!deploy/VERSION')" ]]; then
    echo "⚠️  Uncommitted changes. Commit before deploying."
    exit 1
  fi
  echo "$version" > "$VERSION_FILE"
  git add "$VERSION_FILE"
  git commit -m "Release $version"
  git tag "v$version"
  echo "🏷️  Committed + tagged v$version"
fi

# --- 2) Build the server-arch (amd64) images ---
echo "🐳 Building fluently-backend:$version and fluently-web:$version (linux/amd64) …"
docker build --platform linux/amd64 --build-arg VERSION="$version" \
  -t "fluently-backend:$version" -t fluently-backend:latest backend
docker build --platform linux/amd64 --build-context content=backend/data/expressions \
  -t "fluently-web:$version" -t fluently-web:latest frontend

# --- 3) Ship compose file + images to the VPS (no registry) ---
echo "📦 Shipping to $SSH_TARGET …"
ssh_cmd "mkdir -p '$REMOTE_DIR'"
scp -i "$SSH_KEY" deploy/docker-compose.prod.yml "$SSH_TARGET:$REMOTE_DIR/docker-compose.yml"
docker save "fluently-backend:$version" "fluently-web:$version" | gzip | ssh_cmd 'gunzip | docker load'

# --- 4) First deploy only: generate .env with random secrets on the server ---
# The secrets never leave the VPS. Keep JWT_SECRET stable across moves or every
# user gets logged out (see deploy/README.md).
ssh_cmd "cd '$REMOTE_DIR' && if [ ! -f .env ]; then
  umask 077
  printf 'TAG=%s\nDB_PASSWORD=%s\nJWT_SECRET=%s\n' '$version' \"\$(openssl rand -hex 24)\" \"\$(openssl rand -hex 32)\" > .env
  echo '🔐 Created .env with fresh DB_PASSWORD and JWT_SECRET'
fi"

# --- 5) Activate the new tag (migrations run on backend start-up) ---
echo "🔁 Activating TAG=$version …"
ssh_cmd "cd '$REMOTE_DIR' && sed -i 's/^TAG=.*/TAG=$version/' .env && docker compose up -d --remove-orphans && docker image prune -f > /dev/null"

# --- 6) Validate /api/health reports the new version (retry while it boots) ---
echo "🩺 Validating $HEALTH_URL reports version $version …"
ok=0
for i in $(seq 1 10); do
  body=$(curl -fsS --max-time 10 "$HEALTH_URL" 2>/dev/null || true)
  if echo "$body" | grep -Eq "\"version\":[[:space:]]*\"$version\""; then
    echo "✅ Health OK: $body"
    ok=1; break
  fi
  echo "   …waiting for the new containers ($i/10): ${body:-no response}"
  sleep 3
done
if [[ "$ok" -ne 1 ]]; then
  echo "❌ /api/health did not report version $version. NOT pushing — investigate on the server:"
  echo "   ssh -i $SSH_KEY $SSH_TARGET 'cd $REMOTE_DIR && docker compose ps && docker compose logs --tail 50'"
  echo "   (Fix, then re-run with --no-bump to redeploy this same version and push.)"
  exit 1
fi

# --- 7) Publish the version commit + tag (only if the repo has a remote) ---
if [[ -n "$(git remote)" ]]; then
  echo "⬆️  Pushing commit + tags …"
  git push
  git push --tags
else
  echo "ℹ️  No git remote configured: skipping push."
fi

echo "🎉 Deployed Fluently $version at https://$DOMAIN"
