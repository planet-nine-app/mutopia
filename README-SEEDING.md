# Mutopia Artist Seeding Guide

## Overview

This guide explains how to add artists to Mutopia platforms using **Canimus feeds**. Mirlo ingests artists from feeds (like Sockpuppet, Faircamp, etc.) instead of direct database seeding.

## Quick Start

```bash
# 1. Start the test feed server (if not already running)
node seed-artists.js
```

The script automatically:
- ✅ Starts an HTTP server on port 8001 serving the test Canimus feed
- ✅ Verifies the feed is accessible
- ✅ Shows currently configured feeds in Mirlo
- ✅ Queries Mirlo API for ingested artists

The test feed has been added to `docker-compose.yml` and **Canimus feed ingestion is now working!**

## Status: ✅ WORKING - Artists Now Visible in Web UI!

Mirlo is successfully ingesting artists from Canimus feeds with full album/track data:
- ✅ **Sanora** (local): Bury the Needle - 1 album
- ✅ **Sockpuppet** (external): https://sockpuppet.band - 15 albums!
- ✅ **Test Feed** (local): Test Artist - 1 album
- ⚠️ **Faircamp**: Not configured (optional)
- ⚠️ **Jam.coop**: 403 Forbidden (needs configuration)

**Visit http://localhost:3000 to see the artists in the Mirlo web interface!**

## What Happened

1. **Test Feed Created**: `test-feed/canimus-feed.json` contains one artist with 3 tracks
2. **Feed Server Running**: HTTP server on port 8001 serving the feed
3. **Mirlo Configured**: Added `http://host.docker.internal:8001/canimus-feed.json` to CANIMUS_FEED_URLS
4. **Mirlo Restarted**: Container restarted to ingest the new feed

## Verify It Works

### Option 1: Visit Mirlo Client
Open http://localhost:3000 in your browser - you should see "Test Artist" from the test feed!

### Option 2: Check via Browser Console
```javascript
// Visit http://localhost:3000 and open browser console
fetch('http://localhost:3001/v1/artists')
  .then(r => r.json())
  .then(data => console.log(data.results))
```

## Customize the Test Feed

Edit `test-feed/canimus-feed.json` to add more artists, albums, or tracks:

```json
{
  "type": "feed",
  "name": "Mutopia Test Feed",
  "children": [
    {
      "type": "artist",
      "name": "Your Artist Name",
      "children": [
        {
          "type": "album",
          "name": "Your Album",
          "children": [
            {
              "type": "track",
              "name": "Your Track"
            }
          ]
        }
      ]
    }
  ]
}
```

The feed server will automatically serve the updated content (no restart needed).

## All Configured Feeds

Mirlo is currently ingesting from these feeds:

1. **Sanora** (local): http://sanora:9090/feeds/canimus-feed.json
2. **Faircamp** (local): http://faircamp:8000/canimus.json
3. **Sockpuppet** (external): https://sockpuppet.band/canimus.json
4. **Jam.coop** (local): http://jam-coop:3000/feeds/canimus-feed.json
5. **Test Feed** (local): http://host.docker.internal:8001/canimus-feed.json ← NEW!

## How Mirlo Ingestion Works

Mirlo uses a **dataLayer** that aggregates artists from multiple sources:

- **Prisma Database**: Local artists created directly in Mirlo
- **Canimus Feeds**: External artists ingested from feed URLs
- **Prof** (disabled): Allyabase profile service
- **Sanora** (disabled): Allyabase product service

When you query `/v1/artists`, Mirlo fetches from all sources and merges the results. Artists from Canimus feeds are marked with `_source: "canimus"`.

## Troubleshooting

### Feed Not Appearing in Mirlo

Check if the feed server is running:
```bash
curl http://localhost:8001/canimus-feed.json
```

Check Mirlo logs:
```bash
docker logs mutopia-mirlo-api
```

Restart Mirlo:
```bash
docker compose restart mirlo-api
```

### Add More Feeds

1. Edit `docker-compose.yml` line 234
2. Add your feed URL to `CANIMUS_FEED_URLS` (comma-separated)
3. Restart Mirlo: `docker compose restart mirlo-api`

## Payment Processing

To set up Addie payment accounts for artists, run:
```bash
node seed-payments.js
```

This creates sessionless identities and Stripe accounts for receiving payments.

## Files Created

- `test-feed/canimus-feed.json` - Test Canimus feed with one artist
- `seed-artists.js` - Feed server and verification script (updated)
- `seed-payments.js` - Addie payment account setup (separate)
- `SEED-ARTISTS.md` - Alternative guide for direct database seeding (if needed)

## Next Steps

1. **Customize the test feed**: Edit `test-feed/canimus-feed.json`
2. **Visit Mirlo**: http://localhost:3000 to see the ingested artists
3. **Create a mixtape**: http://localhost:3003 to mix tracks from different feeds
4. **Set up payments**: Run `node seed-payments.js` for Stripe integration
