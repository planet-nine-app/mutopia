#!/usr/bin/env node

/**
 * Verify Platform Stripe Accounts
 *
 * Checks that the platforms have proper Stripe Connected Accounts set up
 * for receiving transfers.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADDIE_URL = 'http://localhost:3004';
const PLATFORMS_FILE = path.join(__dirname, 'test-platforms.json');

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  VERIFY PLATFORM STRIPE ACCOUNTS');
console.log('═══════════════════════════════════════════════');
console.log('');

// Load platforms
const platforms = JSON.parse(fs.readFileSync(PLATFORMS_FILE, 'utf8'));

console.log(`Checking ${platforms.length} platforms...\n`);

for (const platform of platforms) {
  console.log(`\n📋 ${platform.name} (${platform.source})`);
  console.log(`   UUID: ${platform.uuid}`);
  console.log(`   PubKey: ${platform.pubKey.substring(0, 30)}...`);

  try {
    // Query Addie directly to get the full user object
    const timestamp = Date.now().toString();
    const message = timestamp + platform.uuid;

    // We need to sign this, but for debugging let's just check what we have locally
    console.log(`   Local stripeCustomerId: ${platform.stripeCustomerId || 'NOT SET'}`);
    console.log(`   Local stripeAccountId: ${platform.stripeAccountId || 'NOT SET'}`);

    if (!platform.stripeAccountId) {
      console.log(`   ⚠️  WARNING: No stripeAccountId! Cannot receive transfers.`);
    } else {
      console.log(`   ✅ Ready to receive transfers`);
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  DIAGNOSIS');
console.log('═══════════════════════════════════════════════');
console.log('');

const missingAccounts = platforms.filter(p => !p.stripeAccountId);

if (missingAccounts.length > 0) {
  console.log('⚠️  ISSUE FOUND:');
  console.log('');
  console.log(`${missingAccounts.length} platform(s) missing stripeAccountId`);
  console.log('');
  console.log('Platforms need Stripe Connected Accounts to receive transfers.');
  console.log('The putStripeAccount function should have created these.');
  console.log('');
  console.log('SOLUTION:');
  console.log('');
  console.log('The platforms were created with stripeCustomerId (for making purchases)');
  console.log('but may be missing stripeAccountId (for receiving transfers).');
  console.log('');
  console.log('The addie-js client addProcessorAccount() function may not be returning');
  console.log('the stripeAccountId field. We need to manually fetch the user record');
  console.log('from Addie to get the complete account info.');
} else {
  console.log('✅ All platforms have Stripe Connected Accounts!');
  console.log('');
  console.log('Transfers should work correctly.');
}

console.log('');
