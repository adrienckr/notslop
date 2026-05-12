#!/bin/bash
# social-context quickstart — replace placeholders with your keys
# usage: chmod +x examples/quickstart.sh && ./examples/quickstart.sh
set -euo pipefail

echo "1. Setting up ZeroEntropy key (get free at dashboard.zeroentropy.dev)"
echo "   https://dashboard.zeroentropy.dev/?utm_source=social-context-cli&utm_medium=docs&utm_campaign=v0.1"
export ZEROENTROPY_API_KEY="REPLACE_ME"

echo "2. Trying a digest on reddit + hn (free sources)"
npx social-context@latest digest "AI agents" \
  --sources reddit,hn \
  --since 24h \
  --top 5 \
  --format md

echo
echo "3. Done. Next: run 'npx social-context init' to set up X via Bright Data + blogs."
