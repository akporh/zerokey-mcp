#!/bin/bash
set -e

PYTHON=/opt/homebrew/bin/python3.12
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Creating virtual environment with Python 3.12..."
$PYTHON -m venv "$PROJECT_DIR/.venv"

echo "==> Installing dependencies (this takes ~60s first time)..."
"$PROJECT_DIR/.venv/bin/pip" install --upgrade pip --quiet
"$PROJECT_DIR/.venv/bin/pip" install -r "$PROJECT_DIR/requirements.txt" --quiet

echo ""
echo "Done. Virtual environment ready at: $PROJECT_DIR/.venv"
echo ""
echo "Next step:"
echo "  .venv/bin/python setup/generate_keys.py"
