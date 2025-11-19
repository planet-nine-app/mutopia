#!/usr/bin/env node

/**
 * Mutopia Platform Payment Setup
 *
 * Sets up Addie payment accounts for the three platforms:
 * - Mirlo (music platform)
 * - Jam.coop (music cooperative)
 * - Sanora (allyabase music infrastructure)
 *
 * These platform accounts can receive payment splits from Mixtape
 * when users purchase mixtapes containing tracks from multiple platforms.
 */

import addie from '../addie/src/client/javascript/addie.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure addie-js client for localhost
addie.baseURL = 'http://localhost:3004/';

// Service URLs
const PROF_URL = 'http://localhost:5108';

// Platform configurations
const PLATFORMS = [
  {
    name: 'Mirlo',
    email: 'platform@mirlo.local',
    source: 'mirlo',
    country: 'US',
    bio: 'Mirlo music platform - track, store, and streaming infrastructure'
  },
  {
    name: 'Jam.coop',
    email: 'platform@jam.coop',
    source: 'jam',
    country: 'US',
    bio: 'Jam.coop music cooperative platform'
  },
  {
    name: 'Sanora',
    email: 'platform@sanora.local',
    source: 'sanora',
    country: 'US',
    bio: 'Sanora allyabase music infrastructure'
  }
];

// Storage for platform data
const PLATFORMS_FILE = path.join(__dirname, 'test-platforms.json');

/**
 * Create Prof profile for platform (optional)
 */
async function createProfProfile(platformData) {
  try {
    const response = await fetch(`${PROF_URL}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: platformData.name,
        email: platformData.email,
        pubKey: platformData.pubKey,
        uuid: platformData.uuid,
        source: platformData.source,
        bio: platformData.bio,
        type: 'platform',
        tags: ['mutopia', 'platform', platformData.source]
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
 * Setup payment account for a single platform
 */
async function setupPaymentAccount(platformConfig) {
  console.log(`\n💳 Setting up payment account: ${platformConfig.name}`);
  console.log(`   Source: ${platformConfig.source}`);

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
    platformConfig.country,
    platformConfig.name,
    platformConfig.email
  );

  console.log(`  ✓ Stripe processor configured`);
  console.log(`    Customer ID: ${result.stripeCustomerId || 'N/A'}`);
  console.log(`    Account ID: ${result.stripeAccountId || 'N/A'}`);

  if (!result.stripeAccountId) {
    console.warn(`  ⚠️  WARNING: No stripeAccountId returned!`);
    console.warn(`     This platform will NOT be able to receive transfers.`);
  }

  // Create platform data object
  const platformData = {
    name: platformConfig.name,
    email: platformConfig.email,
    source: platformConfig.source,
    country: platformConfig.country,
    bio: platformConfig.bio,
    uuid: uuid,
    pubKey: storedKeys.pubKey,
    privateKey: storedKeys.privateKey,
    stripeCustomerId: result.stripeCustomerId,
    stripeAccountId: result.stripeAccountId  // Critical for receiving transfers!
  };

  // Create Prof profile (optional)
  await createProfProfile(platformData);

  console.log(`\n  ✅ ${platformConfig.name} is ready to receive payments!`);

  return platformData;
}

/**
 * Main execution
 */
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  MUTOPIA PLATFORM PAYMENT SETUP');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('Setting up Addie payment accounts for 3 platforms...');
  console.log('(Mirlo, Jam.coop, Sanora)');
  console.log('');

  const platformAccounts = [];

  // Setup payment account for each platform
  for (const platformConfig of PLATFORMS) {
    try {
      const platformData = await setupPaymentAccount(platformConfig);
      platformAccounts.push(platformData);
    } catch (error) {
      console.error(`\n  ❌ Failed to setup payment account for ${platformConfig.name}:`);
      console.error(`     ${error.message}`);
      process.exit(1);
    }
  }

  // Save platform data to file
  fs.writeFileSync(PLATFORMS_FILE, JSON.stringify(platformAccounts, null, 2));
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  ✅ ALL PLATFORM ACCOUNTS CREATED');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log(`Platform data saved to: ${PLATFORMS_FILE}`);
  console.log('');
  console.log('Summary:');
  console.log('');

  platformAccounts.forEach((platform, index) => {
    console.log(`${index + 1}. ${platform.name} (${platform.source})`);
    console.log(`   UUID:     ${platform.uuid}`);
    console.log(`   PubKey:   ${platform.pubKey.substring(0, 30)}...`);
    console.log(`   Stripe:   ${platform.stripeCustomerId || 'N/A'}`);
    console.log('');
  });

  console.log('Next steps:');
  console.log('');
  console.log('1. Platforms are now registered as Addie customers');
  console.log('2. They can be used as payees in split payment transactions');
  console.log('3. Copy test-platforms.json to mixtape-creator if needed');
  console.log('4. Test split payments from Mixtape Creator: http://localhost:3003');
  console.log('');
}

main().catch(error => {
  console.error('');
  console.error('❌ Platform setup failed:');
  console.error(error);
  console.error('');
  console.error('Make sure Addie is running on port 3004:');
  console.error('  cd /Users/zachbabb/Work/planet-nine/mutopia');
  console.error('  docker compose up -d addie');
  console.error('');
  process.exit(1);
});
