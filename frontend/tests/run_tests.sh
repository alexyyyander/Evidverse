#!/bin/bash
set -e

echo "Running Frontend Tests..."
cd "$(dirname "$0")/.."

# Check if 'test' script exists in package.json
if [ -f package.json ] && grep -q "\"check\":" package.json; then
    echo "Ensuring Playwright browser is installed (headless shell)..."
    npm run test:e2e:install
    npm run check
else
    echo "No 'check' script defined in package.json. Skipping frontend tests."
    echo "To add tests, add a 'check' script to package.json."
fi
