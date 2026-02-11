#!/bin/bash
set -e

echo "Running Frontend Tests..."
cd "$(dirname "$0")/.."

# Check if 'test' script exists in package.json
if [ -f package.json ] && grep -q "\"test\":" package.json; then
    echo "Ensuring Playwright browser is installed (headless shell)..."
    npm run test:e2e:install
    npm test
else
    echo "No 'test' script defined in package.json. Skipping frontend tests."
    echo "To add tests, add a 'test' script to package.json."
fi
