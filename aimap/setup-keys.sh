#!/usr/bin/env bash
# Run once on VPS after git pull to inject real API keys into production.env
# Usage: bash setup-keys.sh
set -e
PROD_ENV="$(dirname "$0")/backend/production.env"

read -rp "OPENAI_API_KEY: " OPENAI_KEY
sed -i "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=${OPENAI_KEY}|" "$PROD_ENV"

read -rp "GEMINI_API_KEY (leave blank to skip): " GEMINI_KEY
if [ -n "$GEMINI_KEY" ]; then
  sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=${GEMINI_KEY}|" "$PROD_ENV"
fi

echo "Keys written to $PROD_ENV"
echo "Run: docker compose up -d --build"
