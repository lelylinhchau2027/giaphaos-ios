#!/usr/bin/env bash
# Tạo remote và push repo mới lên GitHub.
# Cách dùng:
#   ./scripts/push-new-repo.sh Kingltnnn giaphaos-ios
# Cần: đã tạo empty repo trên GitHub, hoặc có token để API tạo.

set -euo pipefail
cd "$(dirname "$0")/.."

USER_NAME="${1:-}"
REPO_NAME="${2:-giaphaos-ios}"

if [[ -z "$USER_NAME" ]]; then
  echo "Usage: $0 <github-username> [repo-name]"
  echo "Example: $0 Kingltnnn giaphaos-ios"
  exit 1
fi

REMOTE="https://github.com/${USER_NAME}/${REPO_NAME}.git"
echo "Remote: $REMOTE"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi

git branch -M main
echo "Pushing main → origin ..."
git push -u origin main
echo "OK: https://github.com/${USER_NAME}/${REPO_NAME}"
echo "Tiếp: GitHub → Actions → Build IPA for ESign → Run workflow"
