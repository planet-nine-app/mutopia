#!/usr/bin/env node

/**
 * Mutopia Payment Processing Setup
 *
 * Sets up Addie payment accounts for test artists.
 * This is separate from artist database seeding (see SEED-ARTISTS.md).
 *
 * Creates sessionless identities and Stripe processor accounts for:
 * 1. Test Artist (Mirlo)
 * 2. Jam Test Artist (Jam.coop)
 * 3. Faircamp Artist (example)
 */

import addie from '../addie/src/client/javascript/addie.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure addie-js client for localhost
addie.baseURL = 'http://localhost:3004/';

// Service URLs (use localhost since we're running from host)
const PROF_URL = 'http://localhost:5108';

// Test artists configuration
const ARTISTS = [
  {
    name: 'Test Artist',
    email: 'test-artist@mutopia.local',
    source: 'mirlo',
    country: 'US'
  },
  {
    name: 'Jam Test Artist',
    email: 'test-artist@jam.local',
    source: 'jam',
    country: 'US'
  },
  {
    name: 'Faircamp Artist',
    email: 'faircamp@test.mutopia.local',
    source: 'faircamp',
    country: 'US'
  }
];

// Storage for artist data
const PAYMENTS_FILE = path.join(__dirname, 'test-payments.json');

/**
 * Create Prof profile for artist (optional)
 */
async function createProfProfile(artistData) {
  try {
    const response = await fetch(`${PROF_URL}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: artistData.name,
        email: artistData.email,
        pubKey: artistData.pubKey,
        uuid: artistData.uuid,
        source: artistData.source,
        bio: `Test artist from ${artistData.source} for Mutopia demo`,
        genres: ['Electronic', 'Experimental'],
        tags: ['mutopia', 'test', artistData.source]
      })
    });

    if (!response.ok) {
      console.warn(`  ⚠ Prof profile creation failed (may not be critical)`);
      return null;
    }

    const profile = await response.json();
    console.log(`  ✓ Created Prof profile`);
    return profile;
  } catch (error) {
    console.warn(`  ⚠ Could not create Prof profile: ${error.message}`);
    return null;
  }
}

/**
 * Setup payment account for a single artist
 */
async function setupPaymentAccount(artistConfig) {
  console.log(`\n💳 Setting up payment account: ${artistConfig.name}`);
  console.log(`   Source: ${artistConfig.source}`);

  // Storage for keys (in-memory for this script)
  let storedKeys = null;

  // Create Addie user with sessionless identity (uses addie-js client)
  const uuid = await addie.createUser(
    async (keys) => {
      storedKeys = keys;
      return keys;
    },
    async () => storedKeys
  );

  console.log(`  ✓ Created Addie user: ${uuid}`);
  console.log(`    Public Key: ${storedKeys.pubKey.substring(0, 20)}...`);

  // Setup Stripe processor (uses addie-js client)
  const result = await addie.addProcessorAccount(
    uuid,
    'stripe',
    artistConfig.country,
    artistConfig.name,
    artistConfig.email
  );

  console.log(`  ✓ Stripe processor configured: ${result.stripeCustomerId}`);

  // Create artist data object
  const artistData = {
    name: artistConfig.name,
    email: artistConfig.email,
    source: artistConfig.source,
    country: artistConfig.country,
    uuid: uuid,
    pubKey: storedKeys.pubKey,
    privateKey: storedKeys.privateKey,
    stripeCustomerId: result.stripeCustomerId
  };

  // Create Prof profile (optional)
  await createProfProfile(artistData);

  console.log(`\n  ✅ ${artistConfig.name} is ready to receive payments!`);

  return artistData;
}

/**
 * Main execution
 */
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  MUTOPIA PAYMENT ACCOUNT SETUP');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('Setting up Addie payment accounts for 3 test artists...');

  const paymentAccounts = [];

  // Setup payment account for each artist
  for (const artistConfig of ARTISTS) {
    try {
      const paymentData = await setupPaymentAccount(artistConfig);
      paymentAccounts.push(paymentData);
    } catch (error) {
      console.error(`\n  ❌ Failed to setup payment account for ${artistConfig.name}:`);
      console.error(`     ${error.message}`);
      process.exit(1);
    }
  }

  // Save payment data to file
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(paymentAccounts, null, 2));
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  ✅ ALL PAYMENT ACCOUNTS CREATED');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log(`Payment data saved to: ${PAYMENTS_FILE}`);
  console.log('');
  console.log('Summary:');
  console.log('');

  paymentAccounts.forEach((artist, index) => {
    console.log(`${index + 1}. ${artist.name} (${artist.source})`);
    console.log(`   UUID:     ${artist.uuid}`);
    console.log(`   PubKey:   ${artist.pubKey.substring(0, 30)}...`);
    console.log(`   Stripe:   ${artist.stripeCustomerId || 'N/A'}`);
    console.log('');
  });

  console.log('Next steps:');
  console.log('');
  console.log('1. Artists are now ready to receive payments via Addie');
  console.log('2. Visit Mixtape Creator: http://localhost:3003');
  console.log('3. Purchase tracks and verify payment splits in Stripe Dashboard');
  console.log('');
}

main().catch(error => {
  console.error('');
  console.error('❌ Payment setup failed:');
  console.error(error);
  console.error('');
  console.error('Make sure Addie is running on port 3004:');
  console.error('  cd /Users/zachbabb/Work/planet-nine/mutopia');
  console.error('  docker compose up -d addie');
  console.error('');
  process.exit(1);
});
