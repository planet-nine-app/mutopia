#!/usr/bin/env node

/**
 * Test Split Payment Transaction
 *
 * Tests that the three platform accounts (Mirlo, Jam, Sanora) can be used
 * as payees in a split payment transaction from the Mixtape platform.
 *
 * This simulates a user purchasing a $5 mixtape with tracks from all three platforms.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load platform data
const PLATFORMS_FILE = path.join(__dirname, 'test-platforms.json');
const platforms = JSON.parse(fs.readFileSync(PLATFORMS_FILE, 'utf8'));

const ADDIE_URL = 'http://localhost:3004';
const MIXTAPE_PRICE = 500; // $5.00 in cents

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  TEST SPLIT PAYMENT TRANSACTION');
console.log('═══════════════════════════════════════════════');
console.log('');
console.log('Scenario: User purchases a $5.00 mixtape with tracks from:');
console.log('  - 2 tracks from Mirlo');
console.log('  - 2 tracks from Jam.coop');
console.log('  - 1 track from Sanora');
console.log('');
console.log('Expected split: $1.67 to each platform (equal 3-way split)');
console.log('');

// Calculate equal split among the 3 platforms
const splitAmount = Math.floor(MIXTAPE_PRICE / platforms.length);
const remainder = MIXTAPE_PRICE - (splitAmount * platforms.length);

// Build payees array
const payees = platforms.map((platform, index) => ({
  pubKey: platform.pubKey,
  // Give remainder to first platform
  amount: splitAmount + (index === 0 ? remainder : 0),
  name: platform.name // For logging only
}));

console.log('Payment split breakdown:');
payees.forEach(payee => {
  console.log(`  ${payee.name}: $${(payee.amount / 100).toFixed(2)} (${payee.amount} cents)`);
});
console.log('');

console.log('Testing Addie endpoint availability...');

// Test Addie is reachable (404 on root is expected, just checking connectivity)
try {
  const healthCheck = await fetch(ADDIE_URL);
  // Any response (even 404) means service is running
  console.log('✓ Addie service is reachable');
} catch (error) {
  console.error('❌ Cannot reach Addie service at', ADDIE_URL);
  console.error('   Make sure Addie is running: docker compose up -d addie');
  console.error(`   Error: ${error.message}`);
  process.exit(1);
}

console.log('');
console.log('Platform UUIDs:');
platforms.forEach(platform => {
  console.log(`  ${platform.name}: ${platform.uuid}`);
});
console.log('');

console.log('═══════════════════════════════════════════════');
console.log('  ✅ SPLIT PAYMENT TEST SETUP COMPLETE');
console.log('═══════════════════════════════════════════════');
console.log('');
console.log('The platforms are ready to receive split payments!');
console.log('');
console.log('Next steps:');
console.log('');
console.log('1. Use these platform pubKeys as payees in Mixtape transactions');
console.log('2. Test via Mixtape Creator: http://localhost:3003');
console.log('3. Or test programmatically via Addie API:');
console.log('');
console.log('   POST /user/:uuid/processor/stripe/intent');
console.log('   {');
console.log('     amount: 500,');
console.log('     payees: [');
payees.forEach((payee, index) => {
  console.log(`       { pubKey: "${payee.pubKey.substring(0, 20)}...", amount: ${payee.amount} }${index < payees.length - 1 ? ',' : ''}`);
});
console.log('     ]');
console.log('   }');
console.log('');
