#!/bin/bash
set -e

echo "Running Backend Tests..."
# Navigate to backend directory
cd "$(dirname "$0")/.."
echo "Current directory: $(pwd)"

# Check if .env exists, if not warn
if [ ! -f .env ]; then
    echo "Warning: .env file not found in backend/. Using default settings."
fi

# Add current directory and project root to PYTHONPATH so 'app' and 'ai_engine' module can be found
export PYTHONPATH=$PYTHONPATH:$(pwd):$(dirname $(pwd))

# Run pytest using python -m to ensure path resolution works better
python3 -m pytest -v -s
