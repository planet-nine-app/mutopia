# Mutopia Quick Start Guide

Get the entire music platform ecosystem running in under 5 minutes.

## Prerequisites

- Docker and Docker Compose installed
- 8GB RAM available
- Ports 3000, 3001, 5118, 9000, 9001, 9090 available

## Start Everything

```bash
cd /Users/zachbabb/Work/planet-nine/mutopia
./start.sh
```

That's it! The script will:
1. Check prerequisites
2. Create `.env` if needed
3. Build Docker images
4. Start all services
5. Wait for health checks
6. Display service URLs

## Initialize Mirlo Database

After services start, initialize the Mirlo database:

```bash
# Run migrations
docker exec -it mutopia-mirlo-api yarn prisma:migrate

# Seed with test data
docker exec -it mutopia-mirlo-api yarn prisma:seed
```

## Access Services

Open these URLs in your browser:

| Service | URL | Description |
|---------|-----|-------------|
| **Mirlo** | http://localhost:3000 | Main streaming platform |
| **Dolores** | http://localhost:5118/audio-player.html | Audio player |
| **Sanora Feed** | http://localhost:9090/feeds/canimus-feed.json | Local Canimus feed |
| **MinIO Console** | http://localhost:9001 | Media storage (user: mirlo, pass: mirlopassword) |

## Test the Integration

### 1. View Sanora Tracks in Mirlo

1. Open Mirlo at http://localhost:3000
2. Navigate to the artist page
3. You should see tracks from the Sanora feed

### 2. Play Tracks via Dolores

1. Click the "Play in Dolores" button on any track
2. The Dolores player opens with the Canimus feed URL
3. Tracks play directly from the source

### 3. External Feed (Sockpuppet.band)

The configuration also includes https://sockpuppet.band/canimus.json as an external feed source. Mirlo should aggregate tracks from both local and external sources.

## Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f mirlo-api
docker compose logs -f sanora
docker compose logs -f dolores
```

## Stopping Services

```bash
./stop.sh
```

Or:

```bash
docker compose down
```

To remove all data:

```bash
docker compose down -v
```

## Troubleshooting

### Services won't start

Check if ports are already in use:
```bash
lsof -i :3000  # Mirlo client
lsof -i :3001  # Mirlo API
lsof -i :9090  # Sanora
lsof -i :5118  # Dolores
```

### Mirlo database errors

Ensure migrations ran successfully:
```bash
docker exec -it mutopia-mirlo-api yarn prisma:migrate
docker exec -it mutopia-mirlo-api yarn prisma:seed
```

### Can't see Canimus feeds in Mirlo

Check if Canimus feed client is configured:
```bash
docker exec -it mutopia-mirlo-api cat /var/www/api/src/utils/allyabase/canimusFeedClient.ts
```

### Sanora feed not accessible

Check if the book-album-blog directory has content:
```bash
ls -la ../sharon/tests/sanora/book-album-blog/
```

## Development Mode

To edit code and see changes:

1. **Mirlo**: Code is mounted via volumes - changes sync automatically
2. **Sanora**: Edit files in `../sharon/tests/sanora/` - restart container to see changes
3. **Dolores**: Edit files in `../dolores/public/` - refresh browser to see changes

## Next Steps

- [ ] Add more Canimus feed sources
- [ ] Configure Faircamp integration
- [ ] Set up Jam.coop integration
- [ ] Create custom feed aggregation layer
- [ ] Deploy to production server

## Success Criteria

You've successfully completed the Mutopia proof of concept when you can:

✅ View tracks from Sanora in Mirlo
✅ View tracks from Sockpuppet.band in Mirlo
✅ Play tracks via the Dolores player
✅ See album artwork from external feeds
✅ Navigate between different feed sources

## Support

For issues, see:
- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical details
- [docker-compose.yml](./docker-compose.yml) - Service configuration
