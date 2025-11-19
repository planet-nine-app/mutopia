#!/usr/bin/env node

/**
 * Update Account Capabilities
 *
 * Updates existing Stripe Connected Accounts to enable transfers capability
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
console.log('  UPDATING ACCOUNT CAPABILITIES');
console.log('═══════════════════════════════════════════════');
console.log('');

// Load platforms
const platforms = JSON.parse(fs.readFileSync(PLATFORMS_FILE, 'utf8'));

console.log(`Updating ${platforms.length} platform accounts...\n`);

for (const platform of platforms) {
  console.log(`\n💳 ${platform.name}`);
  console.log(`   Account ID: ${platform.stripeAccountId}`);

  try {
    // Update account to company type with required info
    const account = await stripeSDK.accounts.update(platform.stripeAccountId, {
      business_type: 'company',
      company: {
        name: platform.name,
        tax_id: '000000000',  // Stripe test tax ID
        address: {
          line1: 'address_full_match',  // Stripe test value
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94102',
          country: 'US'
        }
      },
      business_profile: {
        mcc: '5734',  // Computer software stores
        url: 'https://allyabase.com'
      },
      capabilities: {
        transfers: {
          requested: true
        }
      }
    });

    console.log(`   ✅ Account updated`);
    console.log(`   Type: ${account.business_type}`);
    console.log(`   Transfers capability: ${account.capabilities?.transfers || 'unknown'}`);

  } catch (error) {
    console.error(`   ❌ Failed to update account: ${error.message}`);
  }
}

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  UPDATE COMPLETE');
console.log('═══════════════════════════════════════════════');
console.log('');
console.log('⏱️  Note: Capability activation may take a few moments.');
console.log('   Run check-account-capabilities.js to verify.');
console.log('');
