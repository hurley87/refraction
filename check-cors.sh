#!/bin/bash

# Script to check CORS headers and accessibility for NFT metadata and image URLs

echo "🔍 Checking CORS Headers and Accessibility"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs from your contract
METADATA_URL="https://gateway.pinata.cloud/ipfs/bafkreifdsya4dc3cgv7dwfq4az76apqkomgqlivxwbmjertxzvn2jsjc5q"
IMAGE_URL="https://gateway.pinata.cloud/ipfs/bafkreiguuorzop7lflpnb6i64h6f54d6jt433boqnq2tzfevyucyk3xvra"

check_cors() {
    local url=$1
    local name=$2
    
    echo -e "${BLUE}Checking: ${name}${NC}"
    echo "URL: ${url}"
    echo ""
    
    # Check if URL is accessible
    echo "1. Testing URL accessibility..."
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ URL is accessible (HTTP ${http_code})${NC}"
    else
        echo -e "${RED}✗ URL returned HTTP ${http_code}${NC}"
    fi
    echo ""
    
    # Check CORS headers with OPTIONS request (preflight)
    echo "2. Checking CORS preflight (OPTIONS request)..."
    cors_headers=$(curl -s -I -X OPTIONS \
        -H "Origin: https://freighter.app" \
        -H "Access-Control-Request-Method: GET" \
        --max-time 10 \
        "$url" 2>&1)
    
    if echo "$cors_headers" | grep -qi "access-control-allow-origin"; then
        echo -e "${GREEN}✓ CORS headers present${NC}"
        echo "$cors_headers" | grep -i "access-control" | sed 's/^/   /'
    else
        echo -e "${YELLOW}⚠ No CORS headers found in OPTIONS response${NC}"
        echo "   (This might be okay if the server allows all origins)"
    fi
    echo ""
    
    # Check CORS headers with GET request (actual request)
    echo "3. Checking CORS headers in GET response..."
    get_headers=$(curl -s -I \
        -H "Origin: https://freighter.app" \
        --max-time 10 \
        "$url" 2>&1)
    
    access_control=$(echo "$get_headers" | grep -i "access-control")
    
    if [ -n "$access_control" ]; then
        echo -e "${GREEN}✓ CORS headers in GET response:${NC}"
        echo "$access_control" | sed 's/^/   /'
    else
        echo -e "${YELLOW}⚠ No CORS headers in GET response${NC}"
        echo "   Note: Some servers allow all origins by default (no CORS headers needed)"
    fi
    echo ""
    
    # Check Content-Type
    echo "4. Checking Content-Type..."
    content_type=$(echo "$get_headers" | grep -i "content-type" | head -1)
    if [ -n "$content_type" ]; then
        echo "   $content_type"
    else
        echo -e "${YELLOW}⚠ No Content-Type header found${NC}"
    fi
    echo ""
    
    echo "----------------------------------------"
    echo ""
}

# Check metadata JSON
check_cors "$METADATA_URL" "Metadata JSON"

# Check image
check_cors "$IMAGE_URL" "Image"

echo -e "${BLUE}📝 Additional Checks:${NC}"
echo ""
echo "5. Test in browser console:"
echo "   Open browser DevTools (F12) and run:"
echo ""
echo "   fetch('$METADATA_URL')"
echo "     .then(r => r.json())"
echo "     .then(data => console.log('Metadata:', data))"
echo "     .catch(err => console.error('Error:', err));"
echo ""
echo "   fetch('$IMAGE_URL')"
echo "     .then(r => r.blob())"
echo "     .then(blob => console.log('Image loaded:', blob.size, 'bytes'))"
echo "     .catch(err => console.error('Error:', err));"
echo ""
echo "6. Check browser Network tab:"
echo "   - Open DevTools → Network tab"
echo "   - Try to load the NFT in Freighter"
echo "   - Look for failed requests (red entries)"
echo "   - Check the 'Response Headers' for CORS errors"
echo ""
echo "7. Common CORS issues:"
echo "   - Missing 'Access-Control-Allow-Origin' header"
echo "   - Origin not in allowed list"
echo "   - Missing 'Access-Control-Allow-Methods' for preflight"
echo "   - Missing 'Access-Control-Allow-Headers'"
echo ""
