# Faircamp Demo Content

This directory is where you place your music catalog for Faircamp to build a static site.

## Quick Start

1. **Add your music files** here in a directory structure like:
   ```
   faircamp-demo/
   ├── Album 1/
   │   ├── 01 Track One.mp3
   │   ├── 02 Track Two.mp3
   │   └── cover.jpg
   └── Album 2/
       ├── 01 Another Track.flac
       └── cover.png
   ```

2. **Create a `faircamp.toml`** file (optional) for configuration:
   ```toml
   [catalog]
   name = "My Music Catalog"
   url = "http://localhost:8000"

   [[catalog.artists]]
   name = "Artist Name"
   url = "http://localhost:8000"
   ```

3. **Restart the container** to rebuild:
   ```bash
   docker compose restart faircamp
   ```

## Faircamp Features

- Automatic Canimus feed generation
- Album artwork support  (cover.jpg, front.jpg, album.jpg)
- Multiple audio formats (MP3, FLAC, OGG, M4A, WAV)
- Streaming player interface
- Download links
- RSS feeds

## For Testing

If you don't have audio files handy, you can symlink from the Sharon test directory:

```bash
ln -s ../../../sharon/tests/sanora/book-album-blog/music/* .
```

## Viewing the Site

Once Faircamp builds successfully, visit:
- **Site**: http://localhost:8000
- **Canimus feed**: http://localhost:8000/feed.json (or similar - check Faircamp docs)

## Documentation

See the Faircamp manual: https://simonrepp.com/faircamp/manual
