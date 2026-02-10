#!/bin/bash
set -e

echo "Running Frontend Tests..."
cd "$(dirname "$0")/.."

# Check if 'test' script exists in package.json
if [ -f package.json ] && grep -q "\"test\":" package.json; then
    npm test
else
    echo "No 'test' script defined in package.json. Skipping frontend tests."
    echo "To add tests, install jest and add 'test': 'jest' to package.json."
fi
