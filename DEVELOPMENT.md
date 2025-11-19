# Mutopia Development Guide

## Working with Local Code

All services in Mutopia use the local `third-party/` directories, so you can make changes directly to the source code.

### Service Locations

| Service | Local Directory | Dockerfile Location |
|---------|----------------|-------------------|
| **Mirlo** | `../third-party/mirlo` | `../third-party/mirlo/Dockerfile` |
| **Faircamp** | `../third-party/faircamp` | `../third-party/faircamp/Dockerfile` |
| **Jam.coop** | `../third-party/jam-coop` | `../third-party/jam-coop/Dockerfile` |
| **Sanora** | `../sharon/tests/sanora` | (no Dockerfile, uses Node Alpine) |
| **Dolores** | `../dolores/public` | (no Dockerfile, uses nginx) |

### Making Changes

#### 1. Edit Code Locally

All changes to the third-party directories will be reflected in the containers:

```bash
# Example: Edit Mirlo source
cd /Users/zachbabb/Work/planet-nine/third-party/mirlo/src
# Make your changes...

# Example: Edit Faircamp source
cd /Users/zachbabb/Work/planet-nine/third-party/faircamp
# Make your changes...

# Example: Edit Jam.coop source
cd /Users/zachbabb/Work/planet-nine/third-party/jam-coop
# Make your changes...
```

#### 2. Rebuild Containers (if needed)

**For code changes that require rebuild:**
```bash
cd /Users/zachbabb/Work/planet-nine/mutopia

# Rebuild all services
docker compose build

# Rebuild specific service
docker compose build mirlo-api
docker compose build faircamp
docker compose build jam-coop

# Restart services
docker compose up -d
```

**For code changes with hot reload (no rebuild needed):**
- **Mirlo API/Background**: Source code is mounted, changes sync automatically (watch mode)
- **Mirlo Client**: Vite dev server with hot reload
- **Jam.coop**: Rails server with code reloading (just refresh browser)
- **Dolores**: Static files mounted, just refresh browser
- **Sanora**: Node server, restart container with `docker compose restart sanora`

#### 3. View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f mirlo-api
docker compose logs -f faircamp
docker compose logs -f jam-coop
```

### Hot Reload Details

**Services with automatic hot reload:**
| Service | Method | Notes |
|---------|--------|-------|
| Mirlo API | Volume mount + watch mode | Changes sync instantly |
| Mirlo Client | Vite HMR | Changes reflect in browser |
| Jam.coop | Rails code reloading | Refresh browser after change |
| Dolores | Volume mount | Refresh browser after change |
| Sanora | Volume mount | Restart container after change |

**Services requiring rebuild:**
| Service | Why |
|---------|-----|
| Faircamp | Rust compilation required |

### Debugging

#### Access Container Shell

```bash
# Mirlo API
docker exec -it mutopia-mirlo-api sh

# Faircamp
docker exec -it mutopia-faircamp sh

# Jam.coop
docker exec -it mutopia-jam-coop sh
```

#### Check Database

```bash
# Mirlo database
docker exec -it mutopia-mirlo-db psql -U mirlo -d mirlo

# Jam.coop database
docker exec -it mutopia-jam-db psql -U jamcoop -d jamcoop
```

#### Run Rails Console (Jam.coop)

```bash
docker exec -it mutopia-jam-coop bundle exec rails console
```

#### Run Database Migrations

```bash
# Mirlo
docker exec -it mutopia-mirlo-api yarn prisma:migrate

# Jam.coop
docker exec -it mutopia-jam-coop bundle exec rails db:migrate
```

### Adding New Canimus Feeds

To test integration with new Canimus feeds:

1. **Add to environment** (`.env`):
   ```env
   CANIMUS_FEEDS=http://sanora:9090/feeds/canimus-feed.json,http://faircamp:8000/feed.json,https://sockpuppet.band/canimus.json,http://your-new-feed.com/canimus.json
   ```

2. **Restart services**:
   ```bash
   docker compose restart mirlo-api
   docker compose restart jam-coop
   ```

### Faircamp Content

To add content to Faircamp:

1. **Place audio files** in `mutopia/content/faircamp-demo/`:
   ```
   content/faircamp-demo/
   ├── Artist Name/
   │   ├── Album 1/
   │   │   ├── 01 Track.mp3
   │   │   ├── 02 Track.flac
   │   │   └── cover.jpg
   │   └── Album 2/
   │       └── ...
   ```

2. **Restart Faircamp** to rebuild:
   ```bash
   docker compose restart faircamp
   ```

3. **Monitor build progress**:
   ```bash
   docker compose logs -f faircamp
   ```

### Troubleshooting

#### Port Conflicts

If ports are already in use:

```bash
# Find what's using a port
lsof -i :3000
lsof -i :8000
lsof -i :9090

# Kill the process or change ports in .env
```

#### Container Won't Start

```bash
# Check status
docker compose ps

# View errors
docker compose logs <service-name>

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### Changes Not Reflecting

```bash
# For Mirlo/Jam.coop (hot reload should work)
docker compose restart mirlo-api
docker compose restart jam-coop

# For Faircamp (requires rebuild)
docker compose build faircamp
docker compose up -d faircamp
```

#### Clean Slate

```bash
# Stop and remove everything (keeps volumes)
docker compose down

# Remove volumes too (DESTRUCTIVE - loses databases)
docker compose down -v

# Rebuild from scratch
docker compose build
docker compose up -d
```

## Git Workflow

Since all services use local third-party directories:

```bash
# Check git status in each service
cd /Users/zachbabb/Work/planet-nine/third-party/mirlo
git status

cd /Users/zachbabb/Work/planet-nine/third-party/faircamp
git status

cd /Users/zachbabb/Work/planet-nine/third-party/jam-coop
git status

# Mutopia itself
cd /Users/zachbabb/Work/planet-nine/mutopia
git status
```

**Note**: Changes to `third-party/` projects should be committed to their respective repositories. Mutopia only orchestrates them.

## Performance Tips

1. **Use docker compose watch** instead of `up` for better file sync
2. **Limit running services** - comment out services you're not testing in docker-compose.yml
3. **Allocate more Docker resources** - Increase RAM/CPU in Docker Desktop settings
4. **Use build cache** - Don't use `--no-cache` unless necessary

## Next Steps

- Add Canimus client implementation to Jam.coop
- Configure feed aggregation in Mirlo
- Test cross-platform playback
- Add more content sources
