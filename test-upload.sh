#!/bin/bash

echo "🧪 Testing upload endpoint..."
echo ""

# Test 1: Check endpoint exists (should return 400, not 404)
echo "Test 1: Checking endpoint exists (no file)..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/recipes/upload-image)
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "404"; then
    echo "❌ FAILED: Endpoint returns 404 (doesn't exist)"
    exit 1
elif echo "$RESPONSE" | grep -q "400"; then
    echo "✅ PASSED: Endpoint exists (returns 400 - no file provided)"
else
    echo "⚠️  Unexpected response"
fi

echo ""
echo "Test completed!"
