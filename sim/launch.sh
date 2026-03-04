#!/bin/bash
# RoClaw 3D Simulator Launcher
#
# Builds the mjswan scene (if needed), starts the WebSocket bridge,
# and opens the browser with bridge mode enabled.
#
# Usage: ./sim/launch.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 1. Build mjswan scene (if dist/ doesn't exist)
if [ ! -d "$SCRIPT_DIR/dist" ]; then
  echo "Building mjswan scene..."
  cd "$SCRIPT_DIR" && python build_scene.py
fi

# 2. Start the bridge in the background
cd "$PROJECT_DIR"
echo "Starting mjswan bridge..."
npm run sim:3d &
BRIDGE_PID=$!

# 3. Wait a moment for the bridge to start
sleep 2

# 4. Open browser with bridge parameter
BRIDGE_URL="http://localhost:8000?bridge=ws://localhost:9090"
echo "Opening browser: $BRIDGE_URL"

if command -v open &> /dev/null; then
  open "$BRIDGE_URL"
elif command -v xdg-open &> /dev/null; then
  xdg-open "$BRIDGE_URL"
else
  echo "Open this URL manually: $BRIDGE_URL"
fi

# Wait for bridge to exit
wait $BRIDGE_PID
