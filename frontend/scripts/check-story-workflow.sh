#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NODE20_BIN_DEFAULT="$HOME/.nvm/versions/node/v20.20.0/bin"
NODE20_BIN="${PREFERRED_NODE20_BIN:-$NODE20_BIN_DEFAULT}"

current_node_major() {
  if ! command -v node >/dev/null 2>&1; then
    echo 0
    return
  fi
  node -v | sed -E 's/^v([0-9]+).*/\1/'
}

if [ "$(current_node_major)" -lt 20 ] && [ -x "$NODE20_BIN/node" ]; then
  export PATH="$NODE20_BIN:$PATH"
fi

NODE_MAJOR="$(current_node_major)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "[check-story-workflow] Node >= 20 is required. Current: $(node -v 2>/dev/null || echo not_found)"
  echo "[check-story-workflow] Hint: export PATH=\"$NODE20_BIN:\$PATH\""
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[check-story-workflow] node_modules not found. Run: npm install"
  exit 1
fi

echo "[check-story-workflow] node=$(node -v) npm=$(npm -v)"
echo "[check-story-workflow] 1/2 typecheck"
npm run typecheck

echo "[check-story-workflow] 2/2 targeted vitest suite"
npx vitest run \
  src/__tests__/editor-store.test.ts \
  src/__tests__/story-workflow-store.test.ts \
  src/__tests__/timeline-event-layer.test.tsx \
  src/__tests__/step2-outline-panel.test.tsx \
  src/__tests__/step3-character-panel.test.tsx \
  src/__tests__/step4-node-render-panel.test.tsx \
  src/__tests__/story-node-card.test.tsx \
  src/__tests__/story-progress.test.ts \
  src/__tests__/story-workflow-boundary.test.ts \
  src/__tests__/story-workflow-ui-persistence.test.ts \
  src/__tests__/story-blocker-focus-flow.test.tsx \
  src/__tests__/branch-boundary-workspace.test.ts \
  src/__tests__/editor-header-bar.test.tsx \
  src/__tests__/comfyui-params.test.ts

echo "[check-story-workflow] done"
