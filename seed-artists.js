#!/usr/bin/env node

/**
 * Mutopia Artist Seeding Script
 *
 * This script helps you add artists to Mutopia platforms via Canimus feeds.
 *
 * Mirlo ingests artists from Canimus feeds (like Sockpuppet, Faircamp, etc)
 * using its dataLayer. This script:
 * 1. Starts a simple HTTP server for the test Canimus feed
 * 2. Verifies Mirlo can access the feed
 * 3. Shows you artists ingested from all configured feeds
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_FEED_PORT = 8001;
const TEST_FEED_PATH = path.join(__dirname, 'test-feed/canimus-feed.json');
const MIRLO_API_URL = 'http://localhost:3001';

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  MUTOPIA ARTIST SEEDING VIA CANIMUS FEEDS');
console.log('═══════════════════════════════════════════════');
console.log('');

/**
 * Start a simple HTTP server for the test feed
 */
function startTestFeedServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/canimus-feed.json' || req.url === '/') {
        const feedContent = fs.readFileSync(TEST_FEED_PATH, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(feedContent);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(TEST_FEED_PORT, (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✓ Test feed server started on http://localhost:${TEST_FEED_PORT}`);
        resolve(server);
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`ℹ Test feed server already running on port ${TEST_FEED_PORT}`);
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Verify the test feed is accessible
 */
async function verifyTestFeed() {
  console.log('');
  console.log('Verifying test feed...');

  try {
    const response = await fetch(`http://localhost:${TEST_FEED_PORT}/canimus-feed.json`);
    if (response.ok) {
      const feed = await response.json();
      const artistCount = feed.children?.length || 0;
      console.log(`✓ Test feed accessible: ${feed.name}`);
      console.log(`  Artists: ${artistCount}`);
      return true;
    } else {
      console.log(`✗ Test feed returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`✗ Could not access test feed: ${error.message}`);
    return false;
  }
}

/**
 * Check configured Canimus feeds in Mirlo
 */
async function checkMirloFeeds() {
  console.log('');
  console.log('Checking Canimus feeds configured in Mirlo...');
  console.log('');
  console.log('Current feeds (from docker-compose.yml CANIMUS_FEED_URLS):');
  console.log('  1. http://sanora:9090/feeds/canimus-feed.json');
  console.log('  2. http://faircamp:8000/canimus.json');
  console.log('  3. https://sockpuppet.band/canimus.json');
  console.log('  4. http://jam-coop:3000/feeds/canimus-feed.json');
  console.log('');
  console.log('To add the test feed, update docker-compose.yml:');
  console.log('');
  console.log('  CANIMUS_FEED_URLS: "...,http://host.docker.internal:8001/canimus-feed.json"');
  console.log('');
}

/**
 * Query Mirlo API for artists
 */
async function queryMirloArtists() {
  console.log('Querying Mirlo API for artists...');
  console.log('');

  try {
    const response = await fetch(`${MIRLO_API_URL}/v1/artists`);

    if (!response.ok) {
      console.log(`✗ Mirlo API returned status ${response.status}`);
      console.log('  Make sure Mirlo is running: docker compose up -d mirlo-api');
      return;
    }

    const data = await response.json();
    const artists = data.results || [];

    console.log(`Found ${artists.length} artists in Mirlo:`);
    console.log('');

    artists.forEach((artist, index) => {
      console.log(`${index + 1}. ${artist.name}`);
      console.log(`   ID: ${artist.id}`);
      console.log(`   URL: ${MIRLO_API_URL}/${artist.urlSlug}`);
      if (artist._source) {
        console.log(`   Source: ${artist._source} (from Canimus feed)`);
      }
      console.log('');
    });

    if (artists.length === 0) {
      console.log('  No artists found yet.');
      console.log('  Artists will appear once Mirlo ingests the Canimus feeds.');
      console.log('');
    }

  } catch (error) {
    console.log(`✗ Could not query Mirlo API: ${error.message}`);
    console.log('  Make sure Mirlo is running: docker compose up -d mirlo-api');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Start test feed server
    const server = await startTestFeedServer();

    // Verify test feed
    await verifyTestFeed();

    // Show configured feeds
    await checkMirloFeeds();

    // Query Mirlo for current artists
    await queryMirloArtists();

    console.log('═══════════════════════════════════════════════');
    console.log('  NEXT STEPS');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('1. Add test feed to Mirlo:');
    console.log('   Edit: mutopia/docker-compose.yml');
    console.log('   Add to CANIMUS_FEED_URLS (line 234):');
    console.log('     http://host.docker.internal:8001/canimus-feed.json');
    console.log('');
    console.log('2. Restart Mirlo to ingest the new feed:');
    console.log('   docker compose restart mirlo-api');
    console.log('');
    console.log('3. Verify artists appear:');
    console.log('   node seed-artists.js');
    console.log('   # or visit: http://localhost:3000 (Mirlo client)');
    console.log('');
    console.log('4. Edit test-feed/canimus-feed.json to customize artists');
    console.log('');
    console.log('Keep this script running to serve the test feed...');
    console.log('Press Ctrl+C to stop');
    console.log('');

    // Keep the server running
    if (server) {
      process.on('SIGINT', () => {
        console.log('\n\nStopping test feed server...');
        server.close();
        process.exit(0);
      });
    }

  } catch (error) {
    console.error('');
    console.error('❌ Seeding failed:');
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

main();
