#!/bin/bash

# Mutopia - Stop Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Mutopia services...${NC}"

docker compose down

echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
echo -e "${YELLOW}To start again, run: ./start.sh${NC}"
echo -e "${YELLOW}To remove all data, run: docker compose down -v${NC}"
echo ""
