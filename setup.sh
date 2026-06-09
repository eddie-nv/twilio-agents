#!/usr/bin/env bash
set -euo pipefail

echo "==> twilio-agents setup"

# ── 1. Check for Bun ─────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "Bun not found — installing via the official installer..."
  curl -fsSL https://bun.sh/install | bash
  # Add Bun to PATH for the rest of this script
  export PATH="$HOME/.bun/bin:$PATH"
fi

echo "    bun $(bun --version)"

# ── 2. Install dependencies ──────────────────────────────────────────────────
echo "==> Installing dependencies..."
bun install

# ── 3. Copy .env.example → .env if .env is absent ───────────────────────────
if [ ! -f .env ]; then
  echo "==> Creating .env from .env.example..."
  cp .env.example .env
  echo "    .env created — fill in your keys before starting the server."
else
  echo "    .env already exists — skipping."
fi

# ── 4. Ensure session directory exists ───────────────────────────────────────
SESSION_DIR="${SESSION_DIR:-data/sessions}"
mkdir -p "$SESSION_DIR"

# ── 5. Done ──────────────────────────────────────────────────────────────────
echo ""
echo "Setup complete. Next steps:"
echo ""
echo "  1. Open .env and set:"
echo "       ANTHROPIC_API_KEY=<your Anthropic key>"
echo "       TWILIO_AUTH_TOKEN=<your Twilio auth token>"
echo ""
echo "  2. Start the server:"
echo "       bun run src/server.ts"
echo ""
echo "  3. Run the test suite:"
echo "       bun test"
echo ""
echo "  4. Expose a public HTTPS URL for local development:"
echo "       ngrok http 3000"
echo "     Then set the Twilio webhook to https://<ngrok-id>.ngrok.io/sms"
echo ""
