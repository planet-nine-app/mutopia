#!/usr/bin/env node

/**
 * Setup Platform Payout Cards
 *
 * For test mode, Connected Accounts need bank accounts or payout cards.
 * This script uses Stripe's test debit card to set up instant payouts
 * for each platform's Connected Account.
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
console.log('  SETUP PLATFORM PAYOUT CARDS (Test Mode)');
console.log('═══════════════════════════════════════════════');
console.log('');

// Load platforms
const platforms = JSON.parse(fs.readFileSync(PLATFORMS_FILE, 'utf8'));

console.log(`Setting up payout cards for ${platforms.length} platforms...\n`);

for (const platform of platforms) {
  console.log(`\n💳 ${platform.name}`);
  console.log(`   Account ID: ${platform.stripeAccountId}`);

  try {
    // Create an external account (test bank account) for the Connected Account
    // Stripe test bank account number: 000123456789
    const externalAccount = await stripeSDK.accounts.createExternalAccount(
      platform.stripeAccountId,
      {
        external_account: {
          object: 'bank_account',
          country: 'US',
          currency: 'usd',
          account_holder_name: platform.name,
          account_holder_type: 'company',
          routing_number: '110000000', // Stripe test routing number
          account_number: '000123456789' // Stripe test account number
        }
      }
    );

    console.log(`   ✅ Added test bank account: ${externalAccount.id}`);
    console.log(`      Last4: ${externalAccount.last4}`);
    console.log(`      Bank: ${externalAccount.bank_name || 'STRIPE TEST BANK'}`);

    platform.stripeBankAccountId = externalAccount.id;

  } catch (error) {
    console.error(`   ❌ Failed to add bank account: ${error.message}`);
  }
}

// Save updated platform data
fs.writeFileSync(PLATFORMS_FILE, JSON.stringify(platforms, null, 2));

console.log('');
console.log('═══════════════════════════════════════════════');
console.log('  ✅ PLATFORM PAYOUT SETUP COMPLETE');
console.log('═══════════════════════════════════════════════');
console.log('');
console.log('Summary:');
platforms.forEach((platform, index) => {
  console.log(`${index + 1}. ${platform.name}`);
  console.log(`   Bank Account: ${platform.stripeBankAccountId || 'NOT SET'}`);
});
console.log('');
console.log('Platforms can now receive transfers in test mode!');
console.log('');
