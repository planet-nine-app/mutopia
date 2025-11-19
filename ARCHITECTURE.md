# Mutopia Architecture

## Overview

Mutopia is a proof-of-concept that demonstrates how the Canimus feed format can serve as a universal interchange format for decentralized music platforms.

## Core Concept

**Canimus as the Universal Language:**
Instead of each platform implementing custom integrations with every other platform (N² problem), all platforms produce and/or consume Canimus feeds. This creates a star topology where Canimus is the hub.

```
Without Canimus (N² integrations):
Mirlo ←→ Jam.coop
  ↕         ↕
Sanora ←→ Faircamp

With Canimus (N integrations):
  Mirlo
    ↓
Canimus Feed (JSON)
 ↑  ↓  ↑
Sanora Jam Faircamp
```

## Component Responsibilities

### Content Sources (Feed Producers)

#### 1. Sanora (Port 9090)
- **Technology**: Node.js server (sharon/tests/sanora)
- **Role**: Serves existing test content as Canimus feed
- **Canimus endpoint**: `http://localhost:9090/canimus.json`
- **Content**: Book/album/blog test data from sharon

#### 2. Faircamp (Port 8000)
- **Technology**: Rust static site generator
- **Role**: Generates static sites with embedded Canimus feeds
- **Canimus endpoint**: Built into generated site
- **Content**: Sample artist catalog (to be created)

#### 3. Sockpuppet.band (External)
- **Technology**: Production Canimus feed
- **Role**: Real-world example feed
- **Canimus endpoint**: `https://sockpuppet.band/canimus.json`
- **Content**: Live music catalog

### Content Consumers (Feed Clients)

#### 1. Mirlo (Ports 3000, 3001)
- **Technology**: Node.js API + React client
- **Integration**: Already has Canimus feed client implemented
- **Consumes from**: All three sources
- **Features**:
  - Display tracks/albums from feeds
  - Stream playback
  - "Play in Dolores" button

#### 2. Jam.coop (Port 3002)
- **Technology**: Ruby on Rails 8
- **Integration**: Needs Canimus client implementation (future)
- **Potential features**:
  - Import tracks from feeds
  - Cross-platform discovery
  - Cooperative streaming

#### 3. Dolores (Port 5118)
- **Technology**: Audio player
- **Integration**: Receives feed URLs via query parameter
- **URL format**: `http://localhost:5118/audio-player.html?feedUrl=<encoded>`

## Data Flow

### Example: Playing a Sanora track in Mirlo via Dolores

```
1. Sanora serves content as Canimus feed
   → http://localhost:9090/canimus.json

2. Mirlo fetches and parses Canimus feed
   → canimusFeedClient.ts parses JSON
   → canimusFeedMapper.ts converts to Mirlo structures

3. User clicks "Play in Dolores" on Mirlo
   → URL: http://localhost:5118/audio-player.html?feedUrl=http://localhost:9090/canimus.json

4. Dolores fetches feed and plays tracks
   → Direct audio streaming from original source
```

## Docker Setup

### Strategy
Each service runs in its own container with:
- **Volume mounts** for source code (development mode)
- **Port mappings** to host for easy access
- **Inter-container networking** for service discovery
- **Environment variables** for configuration

### Container Definitions

```yaml
services:
  sanora:
    build: ../sharon/tests/sanora
    ports: ["9090:9090"]
    volumes: ["../sharon:/app/sharon:ro"]

  faircamp:
    build: ../third-party/faircamp
    ports: ["8000:8000"]
    volumes: ["./feeds/faircamp-content:/content"]

  mirlo-db:
    image: postgres:15
    environment:
      POSTGRES_DB: mirlo
      POSTGRES_USER: mirlo
      POSTGRES_PASSWORD: mirlo

  mirlo-api:
    build: ../third-party/mirlo
    depends_on: [mirlo-db]
    ports: ["3001:3001"]
    volumes: ["../third-party/mirlo:/app"]
    environment:
      DATABASE_URL: postgres://mirlo:mirlo@mirlo-db:5432/mirlo

  mirlo-client:
    build: ../third-party/mirlo/client
    depends_on: [mirlo-api]
    ports: ["3000:3000"]
    volumes: ["../third-party/mirlo/client:/app"]

  jam-coop:
    build: ../third-party/jam-coop
    ports: ["3002:3000"]
    volumes: ["../third-party/jam-coop:/app"]
    # Future integration

  dolores:
    # Assuming dolores is a static web app
    build: ../dolores
    ports: ["5118:5118"]
```

## Service Discovery

### Internal (Container-to-Container)
Containers can reach each other by service name:
- `http://sanora:9090/canimus.json`
- `http://faircamp:8000/canimus.json`
- `http://mirlo-api:3001/api`

### External (Browser/Host Access)
Access via localhost with mapped ports:
- Sanora: `http://localhost:9090`
- Faircamp: `http://localhost:8000`
- Mirlo: `http://localhost:3000`
- Mirlo API: `http://localhost:3001`
- Jam.coop: `http://localhost:3002`
- Dolores: `http://localhost:5118`

## Configuration Management

### Feed URLs
Mirlo needs to know which Canimus feeds to fetch:

**Option 1: Environment variables**
```env
CANIMUS_FEEDS=http://sanora:9090/canimus.json,http://faircamp:8000/canimus.json,https://sockpuppet.band/canimus.json
```

**Option 2: Configuration file** (preferred for POC)
```json
{
  "feeds": [
    {
      "name": "Sanora Test",
      "url": "http://localhost:9090/canimus.json",
      "enabled": true
    },
    {
      "name": "Faircamp Demo",
      "url": "http://localhost:8000/canimus.json",
      "enabled": true
    },
    {
      "name": "Sockpuppet",
      "url": "https://sockpuppet.band/canimus.json",
      "enabled": true
    }
  ]
}
```

## Implementation Phases

### Phase 1: Basic Integration (MVP)
- [x] Mirlo already has Canimus client
- [ ] Docker Compose for Sanora
- [ ] Docker Compose for Mirlo
- [ ] Test: View Sanora tracks in Mirlo
- [ ] Test: Play via Dolores

### Phase 2: Faircamp Integration
- [ ] Sample Faircamp content
- [ ] Build Faircamp site
- [ ] Serve Faircamp via Docker
- [ ] Test: View Faircamp albums in Mirlo

### Phase 3: Multi-Source
- [ ] Feed aggregation UI in Mirlo
- [ ] Test: View all sources simultaneously
- [ ] Test: Cross-platform playback

### Phase 4: Jam.coop (Stretch)
- [ ] Implement Canimus client in Rails
- [ ] Test: View feeds in Jam.coop
- [ ] Explore: Bidirectional sync?

## Known Issues & Limitations

### External URL Handling
- Mirlo's image proxy prepends localhost paths to external URLs
- **Solution**: Detect absolute URLs and skip proxy transformation
- **Status**: Fixed in /Users/zachbabb/Work/planet-nine/third-party/mirlo/src/utils/images.ts

### CORS for External Feeds
- Browser security may block cross-origin requests to sockpuppet.band
- **Solution**: May need CORS proxy or Mirlo API to fetch feeds server-side

### Audio Streaming
- Canimus feeds may reference audio files with relative paths
- Need to ensure URLs are absolute or properly resolved

## Success Metrics

1. **Visibility**: Can see tracks from all 3 sources in Mirlo
2. **Playback**: Can play tracks via Dolores from all sources
3. **Deployment**: `./start.sh` successfully starts all services
4. **Documentation**: Clear port mappings and service URLs
5. **Reproducibility**: Works on fresh Docker install

## Future Possibilities

- **Feed aggregation service**: Central service that combines multiple Canimus feeds
- **Feed caching**: Cache external feeds for performance
- **Bi-directional sync**: Write back to Canimus feeds (if source supports)
- **Federation**: Discover feeds via webfinger or similar protocol
- **Search**: Unified search across all federated feeds
