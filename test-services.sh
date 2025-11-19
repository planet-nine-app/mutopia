#!/bin/bash

# Mutopia Services Health Check Script
# Tests all services and reports their status

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test HTTP endpoint
test_http() {
    local name=$1
    local url=$2
    local expected_content=$3

    if response=$(curl -s -m 5 "$url" 2>/dev/null); then
        if [ -n "$expected_content" ]; then
            if echo "$response" | grep -q "$expected_content"; then
                echo -e "${GREEN}✓${NC} $name - ${GREEN}UP${NC} ($url)"
                return 0
            else
                echo -e "${YELLOW}⚠${NC} $name - ${YELLOW}RESPONDING BUT UNEXPECTED CONTENT${NC} ($url)"
                echo "   First 100 chars: ${response:0:100}"
                return 1
            fi
        else
            echo -e "${GREEN}✓${NC} $name - ${GREEN}UP${NC} ($url)"
            return 0
        fi
    else
        echo -e "${RED}✗${NC} $name - ${RED}DOWN${NC} ($url)"
        return 1
    fi
}

# Function to test JSON endpoint
test_json() {
    local name=$1
    local url=$2
    local jq_filter=$3

    if response=$(curl -s -m 5 "$url" 2>/dev/null); then
        if echo "$response" | jq -e "$jq_filter" > /dev/null 2>&1; then
            local value=$(echo "$response" | jq -r "$jq_filter")
            echo -e "${GREEN}✓${NC} $name - ${GREEN}UP${NC} ($url)"
            if [ -n "$value" ] && [ "$value" != "null" ]; then
                echo -e "   ${BLUE}→${NC} $jq_filter = $value"
            fi
            return 0
        else
            echo -e "${YELLOW}⚠${NC} $name - ${YELLOW}INVALID JSON${NC} ($url)"
            echo "   First 100 chars: ${response:0:100}"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $name - ${RED}DOWN${NC} ($url)"
        return 1
    fi
}

echo ""
echo "=================================================="
echo "  MUTOPIA SERVICES HEALTH CHECK"
echo "=================================================="
echo ""

# Track overall status
total=0
passed=0

# ============================================================================
# USER INTERFACES
# ============================================================================
echo -e "${BLUE}━━━ User Interfaces ━━━${NC}"
echo ""

((total++))
test_http "Mixtape Creator" "http://localhost:3003" "Mutopia Mixtape Creator" && ((passed++))

((total++))
test_http "Mirlo Client" "http://localhost:3000" && ((passed++))

((total++))
test_http "Jam.coop" "http://localhost:3002" && ((passed++))

((total++))
test_http "Dolores" "http://localhost:5118/audio-player.html" && ((passed++))

((total++))
test_http "Faircamp" "http://localhost:8000" && ((passed++))

((total++))
test_http "MinIO Console" "http://localhost:9001" "MinIO Console" && ((passed++))

echo ""

# ============================================================================
# CANIMUS FEEDS
# ============================================================================
echo -e "${BLUE}━━━ Canimus Feeds ━━━${NC}"
echo ""

((total++))
test_json "Sanora Feed" "http://localhost:9090/feeds/canimus-feed.json" ".type" && ((passed++))

((total++))
test_json "Faircamp Feed" "http://localhost:8000/canimus.json" ".type" && ((passed++))

((total++))
test_json "Sockpuppet.band Feed" "https://sockpuppet.band/canimus.json" ".type" && ((passed++))

echo ""

# ============================================================================
# API SERVICES
# ============================================================================
echo -e "${BLUE}━━━ API Services ━━━${NC}"
echo ""

((total++))
test_http "Mirlo API Health" "http://localhost:3001/health" && ((passed++))

((total++))
test_json "Mirlo API Artists" "http://localhost:3001/v1/artists" ".results" && ((passed++))

echo ""

# ============================================================================
# ALLYABASE INFRASTRUCTURE
# ============================================================================
echo -e "${BLUE}━━━ Allyabase Infrastructure ━━━${NC}"
echo ""

((total++))
test_http "Continuebee" "http://localhost:5112" && ((passed++))

((total++))
test_http "Prof" "http://localhost:5108" && ((passed++))

((total++))
test_http "Addie" "http://localhost:3004" && ((passed++))

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "=================================================="
echo -e "  SUMMARY: ${passed}/${total} services responding"
echo "=================================================="

if [ $passed -eq $total ]; then
    echo -e "${GREEN}✓ All services are UP!${NC}"
    echo ""
    echo "Quick Links:"
    echo "  • Mixtape Creator: http://localhost:3003"
    echo "  • Mirlo:           http://localhost:3000"
    echo "  • Jam.coop:        http://localhost:3002"
    echo "  • Dolores:         http://localhost:5118/audio-player.html"
    echo "  • Faircamp:        http://localhost:8000"
    echo ""
    exit 0
elif [ $passed -gt 0 ]; then
    echo -e "${YELLOW}⚠ Some services are not responding${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check logs: docker compose logs -f [service-name]"
    echo "  2. Check status: docker compose ps"
    echo "  3. Some services (Faircamp, Jam.coop) may take 30-60s to start"
    echo ""
    exit 1
else
    echo -e "${RED}✗ No services are responding!${NC}"
    echo ""
    echo "Try running:"
    echo "  cd /Users/zachbabb/Work/planet-nine/mutopia"
    echo "  ./start.sh"
    echo ""
    exit 2
fi
