#!/usr/bin/env bash
# Build IPA trên cloud (EAS) — không cần Mac local.
# Yêu cầu: tài khoản Expo (miễn phí) + Apple Developer ($99/năm).

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Gia Phả OS — build IPA"
echo

if [[ ! -f .env ]]; then
  echo "Chưa có file .env. Đang copy từ .env.example..."
  cp .env.example .env
  echo "→ Hãy mở .env và điền EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY"
  echo "  (lấy từ Supabase Dashboard → Settings → API)"
  exit 1
fi

# Load .env vào environment (bỏ comment / dòng trống)
set -a
# shellcheck disable=SC1091
source .env
set +a

if ! command -v eas >/dev/null 2>&1; then
  echo "Cài EAS CLI..."
  npm install -g eas-cli
fi

if ! command -v expo >/dev/null 2>&1; then
  npm install -g expo-cli >/dev/null 2>&1 || true
fi

echo "==> Đăng nhập Expo (nếu chưa):"
eas whoami || eas login

echo "==> Khởi tạo project EAS (bỏ qua nếu đã có projectId)..."
eas init --id "${EAS_PROJECT_ID:-}" 2>/dev/null || eas init || true

PROFILE="${1:-preview}"
echo "==> Build iOS profile: ${PROFILE}"
echo "    preview     = IPA nội bộ (Ad Hoc / internal) — gửi gia đình"
echo "    production  = bản lên App Store / TestFlight"
echo

eas build --platform ios --profile "${PROFILE}" --non-interactive

echo
echo "Xong. Vào https://expo.dev để tải file .ipa khi build xong."
echo "Cài lên iPhone:"
echo "  • TestFlight (dễ nhất cho gia đình)"
echo "  • hoặc Apple Configurator / link cài từ EAS (internal)"
