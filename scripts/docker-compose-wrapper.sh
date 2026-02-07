#!/bin/bash

# Docker Compose wrapper that tries V2 first, then falls back to V1

if command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
    # Use Docker Compose V2 (plugin)
    docker compose "$@"
elif command -v docker-compose &> /dev/null; then
    # Test if docker-compose works (check for distutils error)
    if docker-compose version &> /dev/null; then
        # Fall back to Docker Compose V1 (standalone) if it works
        docker-compose "$@"
    else
        echo "Error: 'docker-compose' is installed but broken (missing Python distutils)." >&2
        echo "" >&2
        echo "To fix this, run one of the following:" >&2
        echo "" >&2
        echo "Option 1 (Recommended): Install Docker Compose plugin:" >&2
        echo "  sudo apt-get install -y docker-compose-plugin" >&2
        echo "" >&2
        echo "Option 2: Fix the old docker-compose:" >&2
        echo "  sudo apt-get install -y python3-distutils" >&2
        exit 1
    fi
else
    echo "Error: Neither 'docker compose' (V2) nor 'docker-compose' (V1) is available." >&2
    echo "" >&2
    echo "To fix this, install Docker Compose plugin:" >&2
    echo "  sudo apt-get install -y docker-compose-plugin" >&2
    exit 1
fi
