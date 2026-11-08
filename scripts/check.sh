#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run lint
npm run format:check
npm run typecheck
(cd analysis && uv run ruff check src tests && uv run ruff format --check src tests && uv run mypy && uv run pytest)
npm run test:coverage
npm run build
npm run test:e2e
