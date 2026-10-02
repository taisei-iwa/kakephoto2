#!/bin/zsh
# 「写真に合わせてデザインする」を手元で動かすための準備。本人がターミナルで実行する(キーは画面に出さない)。
#   1. 紙表具デザイン/.env.gemini の GEMINI_API_KEY を、サイトの .env.local に写す
#   2. 印刷用の取り出し窓口(/api/design/admin)の合言葉 DESIGN_ADMIN_TOKEN を新しく作り、
#      サイトの .env.local と 紙表具デザイン/.env.design(gen_final.py が読む)の両方に書く
# 本番(Netlify)には、同じ 2 つの値を管理画面の Environment variables に入れる(値は .env.local を開いて写す)。
set -e
cd "$(dirname "$0")/.."
SRC="../紙表具デザイン/.env.gemini"
[ -f "$SRC" ] || { echo "$SRC がありません。先に 紙表具デザイン/set_gemini_key.sh を実行してください"; exit 1; }
KEY=$(grep '^GEMINI_API_KEY=' "$SRC" | head -1 | cut -d= -f2-)
[ -n "$KEY" ] || { echo "GEMINI_API_KEY が読めませんでした"; exit 1; }
TOKEN=$(openssl rand -hex 24)

touch .env.local
grep -v -E '^(GEMINI_API_KEY|DESIGN_ADMIN_TOKEN)=' .env.local > .env.local.tmp || true
printf 'GEMINI_API_KEY=%s\nDESIGN_ADMIN_TOKEN=%s\n' "$KEY" "$TOKEN" >> .env.local.tmp
mv .env.local.tmp .env.local
chmod 600 .env.local

DST="../紙表具デザイン/.env.design"
printf 'DESIGN_ADMIN_TOKEN=%s\nDESIGN_SITE=https://kakephoto.com\n' "$TOKEN" > "$DST"
chmod 600 "$DST"

echo "書き込みました: site/.env.local と 紙表具デザイン/.env.design(中身は表示しません)"
echo "開発サーバーが動いていたら、いったん止めて起動し直してください"
