# Mutopia

## NOTE: This repo is a proof-of-concept technical demo of a bunch of stuff I have not bothered to understand completely. My work and expertise is in distributed payment systems having built stored value systems, multiple processor integrations, distribution mechanisms, and other such things. I am not an expert in the music industry, nor this whole ecosystem. 

There seems to be a desire for interoperability amongst different participants in this ecosystem, and this technical demo is about that.

## NOTE: This demo was built almost exclusively by claude, and exists in a works-on-my-machine state. It will almost certainly not work for you. If there's a ton of interest to make it something that works, I might do that, but I wouldn't hold out hope.

**A proof-of-concept integration of decentralized music platforms via Canimus feeds**

## Overview

Mutopia connects multiple music platforms and tools using the [Canimus feed format](https://github.com/PlaidWeb/Canimus) as the universal interchange format:

**Content Sources (Canimus Producers):**
- ✅ **Sanora** - Artist-based infrastructure via allyabase (port 9090)
- ✅ **Faircamp** - Static site generator for audio producers (port 8000)
- ✅ **Sockpuppet.band** - Self-hosted music example (external)

**Consumers (Canimus Clients):**
- ✅ **Mirlo** - Track, store, and streaming infrastructure (ports 3000, 3001)
- ✅ **Jam.coop** - Music cooperative platform (port 3002)
- ✅ **Dolores** - Audio player (port 5118)
- ✅ **Mixtape Creator** - Product website for mixtape purchases with payment splits (port 3003)
- 🔜 **Sanora** (future: also acts as consumer)

**Infrastructure (Allyabase Stack):**
- ✅ **Continuebee** - Authentication service (port 5112)
- ✅ **Prof** - Profile/PII service (port 5108)
- ✅ **Addie** - Payment processing service (port 3004)

## Quick Start

```bash
./start.sh
```

This single command will:
1. Build all necessary Docker containers
2. Start all services with proper routing
3. Display service URLs and ports

### Testing Services

After starting, verify all services are running:

```bash
./test-services.sh
```

This will:
- Check all 16 services for availability
- Validate Canimus feeds (JSON structure)
- Test API endpoints
- Show quick links to main UIs
- Color-coded output (green = up, red = down)

### Seeding Test Artists

To enable payment splits in the Mixtape Creator, seed 3 test artists:

```bash
npm install
npm run seed
```

This creates:
- **Faircamp Artist** - Receives payments for Faircamp/Mirlo tracks
- **Sanora Artist** - Receives payments for Sanora/Jam.coop tracks
- **Sockpuppet Artist** - Receives payments for Sockpuppet.band tracks

Each artist gets a sessionless identity, Addie payment account, and Stripe customer profile.

**See [SEEDING.md](./SEEDING.md) for detailed documentation.**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Canimus Feed Sources                   │
├─────────────────────────────────────────────────────────┤
│  Sanora (9090)  │  Faircamp (8000)  │  Sockpuppet.band │
└────────┬─────────┴──────────┬────────┴────────┬─────────┘
         │                    │                  │
         └────────────────────┼──────────────────┘
                              │
                    Canimus Feeds (JSON)
                              │
         ┌────────────────────┼──────────────────┬──────────┐
         │                    │                  │          │
┌────────▼────────┐  ┌────────▼────────┐  ┌─────▼──────┐  │
│  Mirlo (3000)   │  │ Jam.coop (3002) │  │ Dolores    │  │
│  + API (3001)   │  │                 │  │ (5118)     │  │
└─────────────────┘  └─────────────────┘  └────────────┘  │
                                                           │
                              ┌────────────────────────────┘
                              │
                     ┌────────▼─────────┐
                     │ Mixtape Creator  │
                     │     (3003)       │
                     │  + Addie (3004)  │
                     └──────────────────┘
```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| **Sanora** | 9090 | Canimus feed server (content source) |
| **Faircamp** | 8000 | Static site generator with Canimus feed (content source) |
| **Mirlo Client** | 3000 | Web UI for tracks/streaming (consumer) |
| **Mirlo API** | 3001 | Backend API (consumer) |
| **Jam.coop** | 3002 | Music cooperative platform (consumer) |
| **Mixtape Creator** | 3003 | Product website for mixtape purchases with payment splits |
| **Addie** | 3004 | Payment processing service with Stripe integration |
| **Prof** | 5108 | Profile/PII service (allyabase) |
| **Continuebee** | 5112 | Sessionless authentication service (allyabase) |
| **Dolores** | 5118 | Audio player (consumer) |
| **MinIO Console** | 9001 | Media storage admin UI |

## Success Criteria

- [ ] View Sanora tracks in Mirlo
- [ ] View Faircamp albums in Mirlo
- [ ] View Sockpuppet.band tracks in Mirlo
- [ ] View all three sources in Jam.coop
- [ ] Play tracks from all sources via Dolores
- [ ] Album artwork displays correctly from all sources
- [ ] Cross-platform discovery works (tracks visible across platforms)

## Project Structure

```
mutopia/
├── README.md                 # This file
├── ARCHITECTURE.md           # Detailed architecture documentation
├── SERVICES.md               # Detailed service documentation
├── CANIMUS-INTEGRATION.md    # Canimus integration guide
├── SEEDING.md                # Artist seeding documentation
├── docker-compose.yml        # Main orchestration file
├── start.sh                  # One-command startup script
├── stop.sh                   # Shutdown script
├── seed-artists.js           # Test artist seeding script
├── package.json              # Dependencies for seeding
├── mixtape-creator/          # Mixtape product website
│   ├── index.html           # Main HTML interface
│   ├── styles.css           # Responsive styling
│   ├── app.js               # Core application logic
│   └── README.md            # Mixtape creator documentation
├── services/                 # Service-specific configurations
│   └── sanora/              # Sanora Canimus server config
└── content/                  # Sample content for testing
    └── faircamp-demo/        # Faircamp demo content
```

## Design Principles

1. **Ease over features** - Simple setup, minimal configuration
2. **Single command deployment** - `./start.sh` does everything
3. **Clearly documented routing** - Port assignments and service discovery
4. **Canimus as universal format** - All services speak the same language
5. **Docker-based** - Reproducible, portable, deployable anywhere

## Next Steps

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.
