# Mutopia Services Guide

Detailed documentation for each service in the Mutopia ecosystem.

## Content Sources (Canimus Producers)

### Sanora (Port 9090)

**Purpose**: Serves local Canimus feeds for testing

**Technology**: Node.js HTTP server

**Location**: `../sharon/tests/sanora/`

**Endpoints**:
- `/feeds/canimus-feed.json` - Music feed
- `/feeds/libris-feed.json` - Books feed
- `/feeds/scribus-feed.json` - Blog posts feed
- `/books/`, `/music/`, `/posts/` - Artifact serving

**Configuration**:
- Content directory: Mounted from `../sharon/tests/sanora/book-album-blog`
- Port: 9090 (configurable via .env)

**Docker Details**:
- Container: `mutopia-sanora`
- Build context: `./services/sanora`
- Command: `node serve-store.js book-album-blog --port 9090`
- Health check: Fetches canimus-feed.json

**Adding Content**:
1. Place audio files in `../sharon/tests/sanora/book-album-blog/`
2. Restart container: `docker compose restart sanora`
3. Feed regenerates automatically

### Sockpuppet.band (External)

**Purpose**: Real-world Canimus feed example

**URL**: https://sockpuppet.band/canimus.json

**Integration**: Mirlo fetches this feed along with local Sanora feed

**No Docker Container**: External service, accessed via HTTP

---

## Content Consumers (Canimus Clients)

### Dolores (Port 5118)

**Purpose**: Audio player that consumes Canimus feeds

**Technology**: Static HTML/JavaScript served by nginx

**Location**: `../dolores/public/`

**Key Files**:
- `audio-player.html` - Main player interface
- `audio-player.js` - Player logic

**Usage**:
```
http://localhost:5118/audio-player.html?feedUrl=<encoded-canimus-url>
```

**Docker Details**:
- Container: `mutopia-dolores`
- Image: `nginx:alpine`
- Volume: Mounts `../dolores/public` as nginx root
- Health check: Fetches audio-player.html

**Configuration**: None required - works with any Canimus feed URL

---

### Mixtape Creator (Port 3003)

**Purpose**: Product website for creating and purchasing mixtapes with automatic payment splits

**Technology**: Static HTML/CSS/JavaScript (vanilla) served by nginx

**Location**: `./mixtape-creator/`

**Key Files**:
- `index.html` - Main interface with track browser and checkout
- `styles.css` - Responsive styling with gradient background
- `app.js` - Core application logic
- `README.md` - Full documentation

**Features**:
- Browse tracks from Mirlo, Jam.coop, and Sanora via Canimus feeds
- Create custom mixtapes by selecting tracks across platforms
- $5 fixed price per mixtape
- Automatic payment splits to all artists via Addie
- Stripe integration for secure payments
- LocalStorage persistence for mixtapes

**Usage**:
```
http://localhost:3003
```

**Payment Flow**:
1. User selects tracks from multiple sources
2. Payment splits calculated (equal division among unique artists)
3. Stripe checkout with $5 charge
4. Addie processes payment and distributes to artists

**API Integration**:
- Fetches Canimus feeds from Sanora, Faircamp, Sockpuppet.band
- Creates payment intents via Addie (`http://localhost:3004/payment/create`)
- Processes transfers via Addie (`http://localhost:3004/payment/{id}/process-transfers`)

**Docker Details**:
- Container: `mutopia-mixtape-creator`
- Image: `nginx:alpine`
- Volume: Mounts `./mixtape-creator` as nginx root
- Depends on: sanora, mirlo-api, jam-coop
- Health check: Fetches index.html

**Configuration**:
```javascript
// In app.js
const CONFIG = {
    ADDIE_URL: 'http://localhost:3004',
    MIRLO_API: 'http://localhost:3001/v1',
    JAM_API: 'http://localhost:3002',
    SANORA_API: 'http://localhost:9090',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_REDACTED',
    MIXTAPE_PRICE: 500,  // $5.00 in cents
};
```

**Requirements**:
- Addie service running on port 3004
- Artists must have Addie accounts with allyabase instances
- CORS enabled on all backend services

---

### Mirlo (Ports 3000, 3001)

**Purpose**: Full-featured music streaming platform

**Technology**: Node.js/Express API + React frontend

**Location**: `../third-party/mirlo/`

#### Mirlo API (Port 3001)

**Endpoints**:
- `/v1/artists` - Artist listings (aggregates local + Canimus feeds)
- `/v1/trackGroups` - Albums/releases
- `/v1/tracks` - Individual tracks
- `/health` - Health check

**Environment Variables**:
```bash
DATABASE_URL=postgresql://mirlo:mirlo@mirlo-db:5432/mirlo
REDIS_HOST=mirlo-redis
REDIS_PASSWORD=mirlo
MINIO_HOST=mirlo-minio
MINIO_ROOT_USER=mirlo
MINIO_ROOT_PASSWORD=mirlopassword

# Optional Allyabase integration
PROF_URL=http://host.docker.internal:5108
SANORA_URL=http://host.docker.internal:5121
CONTINUEBEE_URL=http://host.docker.internal:5112
```

**Docker Details**:
- Container: `mutopia-mirlo-api`
- Build: Uses Mirlo Dockerfile target `api`
- Volumes:
  - `../third-party/mirlo/src` (watch mode)
  - `../third-party/mirlo/emails`
  - `mirlo-media-incoming`, `mirlo-media-cache`
- Depends on: mirlo-db, mirlo-redis, mirlo-minio
- Health check: `/health` endpoint

**Database Setup**:
```bash
# First time setup
docker exec -it mutopia-mirlo-api yarn prisma:migrate
docker exec -it mutopia-mirlo-api yarn prisma:seed

# View database
docker exec -it mutopia-mirlo-db psql -U mirlo -d mirlo
```

#### Mirlo Client (Port 3000)

**Technology**: React 18 + Vite + Emotion CSS-in-JS

**Features**:
- Browse artists and albums (local + Canimus feeds)
- Stream audio
- "Play in Dolores" integration
- Album artwork display

**Docker Details**:
- Container: `mutopia-mirlo-client`
- Build: Vite dev server
- Volumes: `../third-party/mirlo/client/src`, `../third-party/mirlo/client/public`
- Environment:
  - `VITE_API_URL=http://localhost:3001`
  - `VITE_CLIENT_DOMAIN=localhost:3000`

#### Mirlo Background Worker

**Purpose**: Process background jobs (audio transcoding, etc.)

**Docker Details**:
- Container: `mutopia-mirlo-background`
- Build: Uses Mirlo Dockerfile target `background`
- Volumes: `../third-party/mirlo/src`, `mirlo-media-processing`

---

## Infrastructure Services

### PostgreSQL (Port 5432 - internal only)

**Purpose**: Mirlo database

**Image**: postgres:15-alpine

**Credentials**:
- User: mirlo
- Password: mirlo
- Database: mirlo

**Docker Details**:
- Container: `mutopia-mirlo-db`
- Volume: `mirlo-db-data` (persistent storage)
- Health check: `pg_isready`

### Redis (Port 6379 - internal only)

**Purpose**: Background job queue for Mirlo

**Image**: redis:alpine

**Credentials**:
- Password: mirlo

**Docker Details**:
- Container: `mutopia-mirlo-redis`
- Health check: `redis-cli incr ping`

### MinIO (Ports 9000, 9001)

**Purpose**: S3-compatible media storage for Mirlo

**Image**: minio/minio

**Ports**:
- 9000: API endpoint
- 9001: Web console (http://localhost:9001)

**Credentials**:
- User: mirlo
- Password: mirlopassword

**Docker Details**:
- Container: `mutopia-mirlo-minio`
- Volume: `mirlo-minio-data` (persistent storage)
- Command: `server --console-address ":9001" /data`

---

## Allyabase Infrastructure Services

### Continuebee (Port 5112)

**Purpose**: Sessionless authentication service

**Technology**: Node.js service using sessionless-node cryptography

**Location**: `../allyabase/deployment/continuebee/src/server/node/`

**Key Features**:
- Cryptographic authentication without passwords
- UUID-based identity management
- Signature validation for API requests
- No session state required

**Endpoints**:
- `/` - Health check
- Authentication validation endpoints

**Docker Details**:
- Container: `mutopia-continuebee`
- Image: `node:20-alpine`
- Working directory: `/app`
- Command: `node continuebee.js`
- Health check: Fetches root endpoint

**Integration**:
- Used by Prof for authentication
- Used by Addie for authentication
- Used by Mirlo for optional allyabase integration

---

### Prof (Port 5108)

**Purpose**: Profile and PII (Personally Identifiable Information) service

**Technology**: Node.js service for managing artist profiles

**Location**: `../allyabase/deployment/prof/src/server/node/`

**Key Features**:
- Artist profile storage
- PII management
- Sessionless authentication via Continuebee
- RESTful API

**Endpoints**:
- `/profiles` - List all profiles
- `/profiles/{uuid}` - Get/update specific profile
- Create, read, update profile data

**Docker Details**:
- Container: `mutopia-prof`
- Image: `node:20-alpine`
- Working directory: `/app`
- Volume: `prof-data:/app/data` (persistent storage)
- Depends on: continuebee
- Command: `node prof.js`
- Health check: Fetches root endpoint

**Data Storage**:
- Persistent volume for profile data
- File-based storage in `/app/data`

**Integration**:
- Used by Mirlo's allyabase data layer
- Used by Addie for artist account management
- Stores artist pubKeys for payment processing

---

### Addie (Port 3004)

**Purpose**: Payment processing service with multi-party payment splits

**Technology**: Node.js service integrating Stripe Connect

**Location**: `../addie/src/server/node/`

**Key Features**:
- Stripe payment processing
- Multi-party payment splits
- Artist account management via Prof
- Sessionless authentication via Continuebee

**Environment Variables**:
- `STRIPE_PUBLISHABLE_KEY`: pk_test_REDACTED
- `STRIPE_KEY`: sk_test_REDACTED
- `PROF_URL`: http://prof:5108
- `CONTINUEBEE_URL`: http://continuebee:5112

**Endpoints**:
- `/payment/create` - Create payment intent with splits
- `/payment/{id}/process-transfers` - Process transfers to payees
- Artist account endpoints

**Docker Details**:
- Container: `mutopia-addie`
- Image: `node:20-alpine`
- Working directory: `/app`
- Volume: `addie-data:/app/data` (persistent storage)
- Depends on: prof, continuebee
- Command: `node addie.js`
- Health check: Fetches root endpoint

**Payment Flow**:
1. Mixtape Creator calls `/payment/create` with payees array
2. Addie creates Stripe payment intent with metadata
3. Client confirms payment with Stripe Elements
4. Addie processes transfers to all payees
5. Each artist receives their split amount

**Data Storage**:
- Persistent volume for payment records
- Stripe handles actual payment processing

**Integration**:
- Required by Mixtape Creator for payment processing
- Integrates with Prof for artist account data
- Uses Continuebee for authentication

---

## Service Dependencies

```
Mirlo Client (3000)
  ↓
Mirlo API (3001)
  ↓
├─ PostgreSQL (5432)
├─ Redis (6379)
└─ MinIO (9000)

Dolores (5118)
  ← feeds ←
           ↓
Sanora (9090)
Sockpuppet.band (external)
```

---

## Network Configuration

All services communicate via the `mutopia-network` Docker bridge network.

**Internal DNS**:
- Services reference each other by container name
- Example: `http://mirlo-api:3000` from within containers

**External Access**:
- All ports mapped to `localhost`
- See docker-compose.yml for port mappings

---

## Volume Management

**Persistent Volumes** (survive `docker compose down`):
- `mirlo-db-data` - PostgreSQL data
- `mirlo-minio-data` - MinIO media files

**Ephemeral Volumes** (cleared on `docker compose down -v`):
- `mirlo-media-incoming` - Upload staging
- `mirlo-media-cache` - Download cache
- `mirlo-media-processing` - Transcoding workspace

**Host Mounts** (watch mode):
- `../sharon/tests/sanora` → Sanora content
- `../dolores/public` → Dolores static files
- `../third-party/mirlo/src` → Mirlo API source
- `../third-party/mirlo/client/src` → Mirlo client source

---

### Faircamp (Port 8000)

**Purpose**: Static site generator for audio producers that generates Canimus feeds

**Technology**: Rust-based static site generator

**Location**: `../third-party/faircamp/`

**Key Features**:
- Automatic Canimus feed generation
- Support for label mode (multiple artists) and artist mode
- Album artwork serving
- Multiple audio format support (opus, mp3)

**Endpoints**:
- `/` - Main Faircamp website
- `/canimus.json` - Generated Canimus feed

**Docker Details**:
- Container: `mutopia-faircamp`
- Build: Multi-stage Rust build from local source
- Ports: 8000:8000
- Volumes:
  - `./content/faircamp-demo:/content:ro` - Demo content
  - `faircamp-output:/output` - Generated site
- Health check: Fetches homepage (60s start period for build)

**Canimus Integration**:
- Added `src/feeds/canimus.rs` - Feed generator module
- Modified `src/feeds.rs` - Integrated into feed system
- Enabled by default alongside Atom/RSS feeds
- Outputs to `/output/canimus.json`

**Adding Content**:
1. Place music files in `./content/faircamp-demo/`
2. Configure `faircamp.toml` with artist/album metadata
3. Rebuild container: `docker compose build faircamp`
4. Restart: `docker compose up -d faircamp`

---

### Jam.coop (Port 3002)

**Purpose**: Music cooperative platform with Canimus feed consumption

**Technology**: Ruby on Rails 8

**Location**: `../third-party/jam-coop/`

**Key Features**:
- Aggregates artists/albums from database AND Canimus feeds
- Virtual ActiveRecord models for Canimus data (no database changes)
- 5-minute caching for feed data
- Transparent source attribution

**Endpoints**:
- `/artists` - Artist listings (merges DB + Canimus)
- `/albums` - Album listings (merges DB + Canimus)
- `/artists/:slug` - Artist profile (supports both sources)
- `/albums/:slug` - Album details (supports both sources)

**Docker Details**:
- Container: `mutopia-jam-coop`
- Build: Uses Jam.coop Dockerfile from local source
- Ports: 3002:3000
- Volumes:
  - `../third-party/jam-coop:/app` - Watch mode
  - `jam-storage:/app/storage` - Persistent uploads
- Environment:
  - `DATABASE_URL`: postgresql://jamcoop:jamcoop@jam-db:5432/jamcoop
  - `CANIMUS_FEED_URLS`: Comma-separated list of Canimus feeds
- Depends on: jam-db, sanora, faircamp
- Health check: Fetches homepage (60s start period for Rails boot)

**Canimus Integration**:
Files created:
- `lib/canimus/feed_client.rb` - HTTP fetching and parsing
- `lib/canimus/feed_mapper.rb` - Virtual model mapping
- `app/services/canimus_service.rb` - Caching and orchestration

Files modified:
- `app/controllers/artists_controller.rb` - Merged queries
- `app/controllers/albums_controller.rb` - Merged queries

**Configuration**:
```yaml
# In docker-compose.yml
environment:
  CANIMUS_FEED_URLS: http://sanora:9090/feeds/canimus-feed.json,http://faircamp:8000/canimus.json,https://sockpuppet.band/canimus.json
```

**Virtual Models**:
- `VirtualArtist` - Behaves like ActiveRecord::Base
- `VirtualAlbum` - Includes artist associations
- `VirtualTrack` - Includes audio URLs from Canimus media array

---

## Adding New Services

To add new services to Mutopia:

1. **Add to docker-compose.yml**:
   ```yaml
   new-service:
     container_name: mutopia-new-service
     build: ../third-party/new-service
     ports:
       - "PORT:PORT"
     networks:
       - mutopia-network
   ```

2. **Update SERVICES.md** with documentation

3. **Add health checks** if possible

4. **Update start.sh** if special startup logic needed

---

## Monitoring and Logs

**View all logs**:
```bash
docker compose logs -f
```

**View specific service**:
```bash
docker compose logs -f mirlo-api
docker compose logs -f sanora
docker compose logs -f dolores
```

**Service health**:
```bash
docker compose ps
```

Shows health status for each service with health checks configured.
