#!/usr/bin/env node

/**
 * Check Account Capabilities
 *
 * Verifies that Stripe Connected Accounts have transfers capability enabled
 */

import _stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stripeSDK = _stripe(process.env.STRIPE_KEY || 'sk_test_REDACTED');

const PLATFORMS_FILE = path.join(__dirname, 'test-platforms.json');

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  CHECKING ACCOUNT CAPABILITIES');
console.log('═══════════════════════════════════════════════');
console.log('');

// Load platforms
const platforms = JSON.parse(fs.readFileSync(PLATFORMS_FILE, 'utf8'));

console.log(`Checking ${platforms.length} platform accounts...\n`);

for (const platform of platforms) {
  console.log(`\n📋 ${platform.name}`);
  console.log(`   Account ID: ${platform.stripeAccountId}`);

  try {
    // Retrieve full account details
    const account = await stripeSDK.accounts.retrieve(platform.stripeAccountId);

    console.log(`   Type: ${account.type}`);
    console.log(`   Business Type: ${account.business_type || 'N/A'}`);
    console.log(`   Charges Enabled: ${account.charges_enabled}`);
    console.log(`   Payouts Enabled: ${account.payouts_enabled}`);
    console.log('');
    console.log('   Capabilities:');

    for (const [capability, status] of Object.entries(account.capabilities || {})) {
      const icon = status === 'active' ? '✅' : status === 'pending' ? '⏳' : '❌';
      console.log(`      ${icon} ${capability}: ${status}`);
    }

    if (account.requirements) {
      console.log('');
      console.log('   Requirements:');
      console.log(`      Currently Due: ${account.requirements.currently_due?.length || 0} items`);
      console.log(`      Eventually Due: ${account.requirements.eventually_due?.length || 0} items`);

      if (account.requirements.currently_due?.length > 0) {
        console.log(`      Details: ${account.requirements.currently_due.join(', ')}`);
      }
    }

  } catch (error) {
    console.error(`   ❌ Failed to retrieve account: ${error.message}`);
  }
}

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  CAPABILITY CHECK COMPLETE');
console.log('═══════════════════════════════════════════════');
console.log('');
