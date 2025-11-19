#!/bin/bash

# Mutopia - One-Command Startup Script
# Connects music platforms via Canimus feeds

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}"
cat << "EOF"
┌────────────────────────────────────────────────────────────┐
│                                                            │
│   ███╗   ███╗██╗   ██╗████████╗ ██████╗ ██████╗ ██╗ █████╗ │
│   ████╗ ████║██║   ██║╚══██╔══╝██╔═══██╗██╔══██╗██║██╔══██╗│
│   ██╔████╔██║██║   ██║   ██║   ██║   ██║██████╔╝██║███████║│
│   ██║╚██╔╝██║██║   ██║   ██║   ██║   ██║██╔═══╝ ██║██╔══██║│
│   ██║ ╚═╝ ██║╚██████╔╝   ██║   ╚██████╔╝██║     ██║██║  ██║│
│   ╚═╝     ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝│
│                                                            │
│         Universal Music Platform Integration              │
│                  via Canimus Feeds                        │
└────────────────────────────────────────────────────────────┘
EOF
echo -e "${NC}"

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose found${NC}"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env created. Edit it if you need custom configuration.${NC}"
fi

# Stop any existing containers
echo -e "${BLUE}🛑 Stopping any existing Mutopia containers...${NC}"
docker compose down 2>/dev/null || true

# Build and start services
echo -e "${BLUE}🏗️  Building Docker images...${NC}"
docker compose build

echo -e "${BLUE}🚀 Starting services...${NC}"
docker compose up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"

check_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}  ✅ $name is ready${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    echo -e "${RED}  ❌ $name failed to start${NC}"
    return 1
}

echo ""
check_service "Sanora" "http://localhost:9090/feeds/canimus-feed.json"
check_service "Faircamp" "http://localhost:8000/" || echo -e "${YELLOW}  ⚠️  Faircamp may still be building${NC}"
check_service "Dolores" "http://localhost:5118/audio-player.html"
check_service "Mirlo API" "http://localhost:3001/health" || echo -e "${YELLOW}  ⚠️  Mirlo API may need database setup${NC}"
check_service "Jam.coop" "http://localhost:3002/" || echo -e "${YELLOW}  ⚠️  Jam.coop may still be initializing${NC}"

# Initialize Mirlo database
echo ""
echo -e "${BLUE}🗄️  Initializing Mirlo database...${NC}"
if docker exec mutopia-mirlo-api yarn prisma:migrate > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Prisma migrations applied${NC}"
else
    echo -e "${RED}  ❌ Prisma migrations failed${NC}"
fi

if docker exec mutopia-mirlo-api yarn prisma:seed > /dev/null 2>&1; then
    echo -e "${GREEN}  ✅ Database seeded${NC}"
else
    echo -e "${RED}  ❌ Database seeding failed${NC}"
fi

# Display service URLs
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Mutopia is running!${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📡 Content Sources (Canimus Producers):${NC}"
echo -e "  ${CYAN}Sanora Feed:${NC}     http://localhost:9090/feeds/canimus-feed.json"
echo -e "  ${CYAN}Faircamp:${NC}        http://localhost:8000"
echo -e "  ${CYAN}Sockpuppet:${NC}      https://sockpuppet.band/canimus.json"
echo ""
echo -e "${YELLOW}🎵 Consumers:${NC}"
echo -e "  ${CYAN}Mixtape Creator:${NC} http://localhost:3003"
echo -e "  ${CYAN}Mirlo:${NC}           http://localhost:3000"
echo -e "  ${CYAN}Mirlo API:${NC}       http://localhost:3001"
echo -e "  ${CYAN}Jam.coop:${NC}        http://localhost:3002"
echo -e "  ${CYAN}Dolores Player:${NC}  http://localhost:5118/audio-player.html"
echo ""
echo -e "${YELLOW}🔧 Infrastructure:${NC}"
echo -e "  ${CYAN}MinIO Console:${NC}   http://localhost:9001 (user: mirlo, pass: mirlopassword)"
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📖 Next steps:${NC}"
echo -e "  1. Open Mixtape Creator:"
echo -e "     ${CYAN}http://localhost:3003${NC}"
echo ""
echo -e "  2. Open Mirlo in your browser:"
echo -e "     ${CYAN}http://localhost:3000${NC}"
echo ""
echo -e "  3. View logs:"
echo -e "     ${CYAN}docker compose logs -f${NC}"
echo ""
echo -e "  4. Stop services:"
echo -e "     ${CYAN}./stop.sh${NC} or ${CYAN}docker compose down${NC}"
echo ""
echo -e "${GREEN}🎵 Create a mixtape with tracks from multiple platforms!${NC}"
echo ""
