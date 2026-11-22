#!/usr/bin/env bash
# =========================================================
# YD Studios — YKS Haftalık Takip
# GitHub deposu oluştur + push et (token ile, şifre gerekmez)
#
# Kullanım:
#   GH_TOKEN=ghp_xxxxxxxx ./deploy-github.sh [repo-adi]
#   ./deploy-github.sh            # token sorulur, repo adı varsayılan
#   REPO_PRIVATE=1 ./deploy-github.sh
#
# Token izinleri (fine-grained): Contents=Read/Write, Metadata=Read,
# "Admin" veya repo oluşturma yetkisi (classic: repo).
# =========================================================
set -euo pipefail
export LC_ALL=C

cd "$(dirname "$0")"

REPO_NAME="${1:-yks-haftalik-takip}"
if [[ ! "$REPO_NAME" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "✖ Geçersiz repo adı: '$REPO_NAME' (harf, rakam, . _ - kullan)."
  exit 1
fi
PRIVATE_FLAG="false"
if [[ "${REPO_PRIVATE:-0}" == "1" ]]; then PRIVATE_FLAG="true"; fi

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "✖ Gerekli araç yok: $1"; exit 1; }
}
need git
need curl
need python3

if [[ -z "${GH_TOKEN:-}" ]]; then
  read -rsp "GitHub Personal Access Token: " GH_TOKEN
  echo
fi
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "✖ Token boş. GH_TOKEN=... ile ver ya da sorulduğunda gir."
  exit 1
fi

AUTH_HEADER="Authorization: Bearer ${GH_TOKEN}"
ACCEPT="Accept: application/vnd.github+json"

echo "→ GitHub kullanıcısı doğrulanıyor…"
USER_JSON="$(curl -fsS -H "$AUTH_HEADER" -H "$ACCEPT" https://api.github.com/user)"
LOGIN="$(printf '%s' "$USER_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("login",""))')"
if [[ -z "$LOGIN" ]]; then
  echo "✖ Token geçersiz ya da kullanıcı okunamadı."
  exit 1
fi
echo "✔ Kullanıcı: $LOGIN"

echo "→ Depo kontrol ediliyor: $LOGIN/$REPO_NAME"
HTTP_CODE="$(curl -sS -o /tmp/yd_repo_check.json -w '%{http_code}' \
  -H "$AUTH_HEADER" -H "$ACCEPT" "https://api.github.com/repos/$LOGIN/$REPO_NAME")"

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "✔ Depo zaten var."
else
  echo "→ Depo oluşturuluyor…"
  CREATE_CODE="$(curl -sS -o /tmp/yd_repo_create.json -w '%{http_code}' -X POST \
    -H "$AUTH_HEADER" -H "$ACCEPT" \
    -d "{\"name\":\"$REPO_NAME\",\"private\":$PRIVATE_FLAG,\"auto_init\":false}" \
    https://api.github.com/user/repos)"
  if [[ "$CREATE_CODE" != "201" && "$CREATE_CODE" != "422" ]]; then
    echo "✖ Depo oluşturulamadı (HTTP $CREATE_CODE). Yanıt:"
    head -c 600 /tmp/yd_repo_create.json 2>/dev/null || true
    echo
    exit 1
  fi
  echo "✔ Depo hazır."
fi

# Git deposu
if [[ ! -d .git ]]; then
  git init -q
  git symbolic-ref HEAD refs/heads/main
  echo "✔ git init (main)"
fi

git config user.name >/dev/null 2>&1 || git config user.name "$LOGIN"
git config user.email >/dev/null 2>&1 || git config user.email "${LOGIN}@users.noreply.github.com"

git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "YKS Haftalık Takip + canlı lig API"
  echo "✔ Commit oluşturuldu."
else
  echo "• Commit edilecek değişiklik yok."
fi

REMOTE_URL="https://github.com/$LOGIN/$REPO_NAME.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi
echo "✔ origin: $REMOTE_URL"

# Token'ı .git/config'e yazmadan push (basic auth header)
AUTH_B64="$(printf 'x-access-token:%s' "$GH_TOKEN" | base64 | tr -d '\n')"
echo "→ Push ediliyor…"
if git -c http.extraheader="AUTHORIZATION: basic ${AUTH_B64}" push -u origin HEAD:main; then
  echo "✔ Push tamam: https://github.com/$LOGIN/$REPO_NAME"
else
  echo "✖ Push başarısız. Uzak depoda farklı geçmiş olabilir."
  echo "  Zorlamak için: git -c http.extraheader=... push --force-with-lease origin HEAD:main"
  exit 1
fi

cat <<EOF

────────────────────────────────────────────
Sonraki adım: Vercel
────────────────────────────────────────────
1) https://vercel.com/new → GitHub → $LOGIN/$REPO_NAME içe aktar
2) Framework: Other · Build: yok · Output: ./
3) Storage → Upstash Redis (veya KV) ekle (env otomatik gelir)
   Gerekli env: KV_REST_API_URL + KV_REST_API_TOKEN
   (alternatif: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
4) Deploy → ana sayfa index.html, uygulama /app.html, API /api/league
────────────────────────────────────────────
Güvenlik: İşin bitince token'ı iptal et →
https://github.com/settings/tokens
────────────────────────────────────────────
EOF