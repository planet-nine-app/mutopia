// Setup Stripe Connected Accounts for test artists
// This creates Addie users with Stripe accounts that can receive transfers

import fetch from 'node-fetch';

const ADDIE_URL = 'http://localhost:3004';

// Test artists from test-artists.json
const testArtists = [
  {
    source: 'sanora',
    name: 'Bury the Needle',
    pubKey: '0x02f7e5e7b8c3a9d1e6f4a2b8c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1',
    uuid: 'bury-the-needle-sanora',
    email: 'bury-the-needle@mutopia.test',
    country: 'US'
  },
  {
    source: 'faircamp',
    name: 'Faircamp Artist',
    pubKey: '0x03a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    uuid: 'faircamp-test-artist',
    email: 'faircamp@mutopia.test',
    country: 'US'
  },
  {
    source: 'sockpuppet',
    name: 'Sockpuppet',
    pubKey: '0x04b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5',
    uuid: 'sockpuppet-band',
    email: 'sockpuppet@mutopia.test',
    country: 'US'
  }
];

// Create sessionless signature (mock for demo)
function createMockSignature(message) {
  return 'demo_signature_' + Buffer.from(message).toString('base64').substring(0, 64);
}

async function setupArtist(artist) {
  console.log(`\n📝 Setting up ${artist.name}...`);

  const timestamp = Date.now().toString();

  try {
    // 1. Create Addie user
    console.log(`   Creating Addie user...`);
    const createUserResponse = await fetch(`${ADDIE_URL}/user/create`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pubKey: artist.pubKey,
        timestamp: timestamp,
        signature: createMockSignature(timestamp + artist.pubKey)
      })
    });

    if (!createUserResponse.ok) {
      const error = await createUserResponse.json();
      console.error(`   ❌ Failed to create user:`, error);
      return false;
    }

    const userData = await createUserResponse.json();
    console.log(`   ✅ User created with UUID: ${userData.uuid}`);

    // 2. Set up Stripe Connected Account
    console.log(`   Creating Stripe Connected Account...`);
    const setupStripeResponse = await fetch(`${ADDIE_URL}/user/${userData.uuid}/processor/stripe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: timestamp,
        country: artist.country,
        name: artist.name,
        email: artist.email,
        signature: createMockSignature(timestamp + userData.uuid + artist.name + artist.email)
      })
    });

    if (!setupStripeResponse.ok) {
      const error = await setupStripeResponse.json();
      console.error(`   ❌ Failed to setup Stripe account:`, error);
      return false;
    }

    const stripeData = await setupStripeResponse.json();
    console.log(`   ✅ Stripe account created: ${stripeData.stripeAccountId}`);

    return {
      ...artist,
      addieUuid: userData.uuid,
      stripeAccountId: stripeData.stripeAccountId
    };

  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🎵 Mutopia Mixtape Creator - Stripe Account Setup');
  console.log('================================================\n');
  console.log('Setting up Stripe Connected Accounts for test artists...\n');

  const results = [];

  for (const artist of testArtists) {
    const result = await setupArtist(artist);
    if (result) {
      results.push(result);
    }
  }

  console.log('\n================================================');
  console.log(`✅ Setup complete! ${results.length}/${testArtists.length} artists configured.`);
  console.log('\nArtist accounts with Stripe:');
  results.forEach(artist => {
    console.log(`  - ${artist.name}: ${artist.stripeAccountId}`);
  });
  console.log('\nYou can now make purchases and see real transfers in Stripe Dashboard!');
}

main().catch(console.error);
