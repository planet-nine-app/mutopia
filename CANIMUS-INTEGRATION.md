# Canimus Feed Integration - Mutopia

This document describes the Canimus feed integration across all services in Mutopia.

## Overview

Canimus is a universal music syndication format that enables seamless sharing of music metadata across different platforms. Mutopia uses Canimus as the common language between:

**Content Sources** (Canimus Producers):
- Sanora - Artist infrastructure via allyabase
- Faircamp - Static site generator for audio producers
- Sockpuppet.band - Self-hosted music example

**Content Consumers** (Canimus Clients):
- Mirlo - Music streaming and patronage platform
- Jam.coop - Music cooperative platform
- Dolores - Audio player

## Canimus Specification

The Canimus format follows a hierarchical structure:

```json
{
  "type": "feed",
  "url": "https://example.com/",
  "children": [
    {
      "type": "artist",
      "name": "Artist Name",
      "children": [
        {
          "type": "album",
          "name": "Album Title",
          "images": {
            "cover": { "src": "https://..." }
          },
          "children": [
            {
              "type": "track",
              "name": "Track Title",
              "Artist": "Artist Name",
              "duration": 180,
              "media": [
                {
                  "type": "audio/mp3",
                  "src": "https://..."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Implementation Details

### 1. Faircamp (Producer)

**Location**: `/Users/zachbabb/Work/planet-nine/third-party/faircamp/`

**Files Created/Modified**:
- `src/feeds/canimus.rs` - NEW: Canimus feed generator
- `src/feeds.rs` - MODIFIED: Added canimus module and configuration
- `Cargo.toml` - MODIFIED: Added serde_json dependency

**How It Works**:
- Scans music catalog for artists, albums, and tracks
- Generates JSON feed following Canimus specification
- Outputs to `/output/canimus.json`
- Serves at `http://faircamp:8000/canimus.json`

**Key Features**:
- Automatic generation during site build
- Supports label mode (multiple artists) and artist mode (single artist)
- Includes album artwork URLs
- Provides streaming URLs for multiple formats (opus, mp3)
- Enabled by default alongside Atom and RSS feeds

**Configuration**:
```dockerfile
# In Faircamp Dockerfile
CMD faircamp --build-dir /output --preview
```

### 2. Jam.coop (Consumer)

**Location**: `/Users/zachbabb/Work/planet-nine/third-party/jam-coop/`

**Files Created**:
- `lib/canimus/feed_client.rb` - Fetches and parses Canimus feeds
- `lib/canimus/feed_mapper.rb` - Maps Canimus data to virtual Rails models
- `app/services/canimus_service.rb` - Orchestrates fetching and caching

**Files Modified**:
- `app/controllers/artists_controller.rb` - Merges database and Canimus artists
- `app/controllers/albums_controller.rb` - Merges database and Canimus albums

**How It Works**:
1. **Feed Fetching** (`FeedClient`):
   - Reads `CANIMUS_FEED_URLS` environment variable (comma-separated)
   - Fetches feeds via HTTP
   - Validates feed structure
   - Parses JSON into Ruby hashes

2. **Data Mapping** (`FeedMapper`):
   - Converts Canimus data to virtual ActiveRecord-like objects
   - Creates `VirtualArtist`, `VirtualAlbum`, and `VirtualTrack` classes
   - Generates deterministic IDs using SHA256 hashing
   - Maintains compatibility with Rails conventions

3. **Caching** (`CanimusService`):
   - Caches feed data for 5 minutes using Rails.cache
   - Provides finder methods (by slug, by ID)
   - Handles errors gracefully

4. **Controller Integration**:
   - Artists index: Merges database + Canimus artists
   - Albums index: Merges database + Canimus albums
   - Artist show: Supports both database and Canimus artists
   - Album show: Supports both database and Canimus albums

**Configuration**:
```yaml
# In docker-compose.yml
environment:
  CANIMUS_FEED_URLS: http://sanora:9090/feeds/canimus-feed.json,http://faircamp:8000/canimus.json,https://sockpuppet.band/canimus.json
```

**Virtual Model Features**:
- Implement Rails-like interface (`persisted?`, `to_param`, etc.)
- Marked with `source: 'canimus'` for identification
- Support associations (`artist.albums`, `album.tracks`)
- Compatible with existing views without modification

### 3. Mirlo (Consumer)

**Location**: `/Users/zachbabb/Work/planet-nine/third-party/mirlo/`

**Files** (previously implemented):
- `src/utils/allyabase/canimusFeedClient.ts` - TypeScript feed client
- `src/utils/mappers/canimusFeedMapper.ts` - Maps to Mirlo structures

**How It Works**:
- Similar to Jam.coop but in TypeScript
- Converts Canimus data to Mirlo's Artist, TrackGroup, and Track structures
- Uses environment variable `CANIMUS_FEED_URLS`
- Generates deterministic IDs for consistent referencing

## Feed URLs

All services consume from these three Canimus feeds:

| Source | URL | Contents |
|--------|-----|----------|
| **Sanora** | `http://sanora:9090/feeds/canimus-feed.json` | Books, albums, blog posts |
| **Faircamp** | `http://faircamp:8000/canimus.json` | User-uploaded music catalog |
| **Sockpuppet.band** | `https://sockpuppet.band/canimus.json` | Self-hosted music example |

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                  Canimus Feed Sources                   │
├─────────────────────────────────────────────────────────┤
│  Sanora (9090)  │  Faircamp (8000)  │  Sockpuppet.band │
│                 │                   │                  │
│  Generates:     │  Generates:       │  Generates:      │
│  canimus.json   │  canimus.json     │  canimus.json    │
└────────┬────────┴──────────┬────────┴────────┬─────────┘
         │                   │                  │
         │         Canimus Feeds (JSON)         │
         │                   │                  │
         └───────────────────┼──────────────────┘
                             │
         ┌───────────────────┼──────────────────┐
         │                   │                  │
┌────────▼────────┐  ┌───────▼────────┐  ┌─────▼──────┐
│  Mirlo (3000)   │  │ Jam.coop (3002)│  │ Dolores    │
│                 │  │                │  │ (5118)     │
│  Fetches:       │  │  Fetches:      │  │ Fetches:   │
│  - CANIMUS_     │  │  - CANIMUS_    │  │ - Manual   │
│    FEED_URLS    │  │    FEED_URLS   │  │   input    │
│                 │  │                │  │            │
│  Maps to:       │  │  Maps to:      │  │ Plays:     │
│  - Artists      │  │  - Virtual     │  │ - Audio    │
│  - TrackGroups  │  │    Artists     │  │   tracks   │
│  - Tracks       │  │  - Virtual     │  │            │
│                 │  │    Albums      │  │            │
│                 │  │  - Virtual     │  │            │
│                 │  │    Tracks      │  │            │
└─────────────────┘  └────────────────┘  └────────────┘
```

## Testing

### Start All Services

```bash
cd /Users/zachbabb/Work/planet-nine/mutopia
./start.sh
```

This starts:
- Sanora on port 9090
- Faircamp on port 8000
- Mirlo on ports 3000 (client) and 3001 (API)
- Jam.coop on port 3002
- Dolores on port 5118

### Verify Feeds

```bash
# Check Sanora feed
curl http://localhost:9090/feeds/canimus-feed.json | jq '.type'

# Check Faircamp feed (after build completes)
curl http://localhost:8000/canimus.json | jq '.type'

# Check external feed
curl https://sockpuppet.band/canimus.json | jq '.type'
```

### Test Jam.coop Integration

1. **Visit Artists Page**:
   ```
   http://localhost:3002/artists
   ```
   Should show both database artists AND Canimus artists from all three feeds

2. **Visit Albums Page**:
   ```
   http://localhost:3002/albums
   ```
   Should show both database albums AND Canimus albums

3. **Click on Canimus Artist**:
   Should navigate to artist show page with albums from that Canimus feed

4. **Click on Canimus Album**:
   Should show album details with tracks

### Test Mirlo Integration

1. **Visit Mirlo**:
   ```
   http://localhost:3000
   ```

2. **Browse Artists**:
   Should show both local and Canimus artists

3. **Play Tracks**:
   Should be able to play tracks from Sanora, Faircamp, and Sockpuppet.band

### Clear Cache (Development)

If feed data seems stale in Jam.coop:

```ruby
# In Rails console
docker exec -it mutopia-jam-coop bundle exec rails console
CanimusService.clear_cache
```

## Troubleshooting

### Jam.coop Not Showing Canimus Data

1. **Check environment variable**:
   ```bash
   docker exec mutopia-jam-coop env | grep CANIMUS
   ```

2. **Check logs**:
   ```bash
   docker compose logs jam-coop | grep Canimus
   ```

3. **Test feed fetch manually**:
   ```bash
   docker exec -it mutopia-jam-coop bundle exec rails runner "puts Canimus::FeedClient.fetch_all_feeds.inspect"
   ```

### Faircamp Not Generating Feed

1. **Check build logs**:
   ```bash
   docker compose logs faircamp | grep canimus
   ```

2. **Verify file exists**:
   ```bash
   docker exec mutopia-faircamp ls -la /output/canimus.json
   ```

3. **Check for Rust compilation errors**:
   ```bash
   docker compose logs faircamp | grep error
   ```

### Feed URLs Not Accessible

1. **Check service health**:
   ```bash
   docker compose ps
   ```

2. **Test connectivity between containers**:
   ```bash
   docker exec mutopia-jam-coop curl http://sanora:9090/feeds/canimus-feed.json
   docker exec mutopia-jam-coop curl http://faircamp:8000/canimus.json
   ```

## Benefits of Canimus Integration

1. **Universal Format**: One format works across all platforms
2. **No Database Changes**: Canimus data is virtual, no migrations needed
3. **Real-time Updates**: Changes in feeds reflected after cache expiry (5 min)
4. **Scalability**: Add new feeds by updating environment variable
5. **Flexibility**: Mix database and federated content seamlessly
6. **Independence**: Artists can self-host with Faircamp

## Future Enhancements

- [ ] Add Canimus feed generation to Jam.coop (make it a producer too)
- [ ] Implement feed caching with ETag support
- [ ] Add background job to periodically refresh feeds
- [ ] Support authentication for private feeds
- [ ] Add feed health monitoring dashboard
- [ ] Implement Canimus feed search/discovery
- [ ] Add support for Canimus extensions (ratings, comments)

## References

- Canimus Specification: https://github.com/PlaidWeb/Canimus
- Example Feed: https://sockpuppet.band/canimus.json
- Mutopia Documentation: /Users/zachbabb/Work/planet-nine/mutopia/README.md
- Development Guide: /Users/zachbabb/Work/planet-nine/mutopia/DEVELOPMENT.md
