# Artist Seeding for Mutopia

## Overview

The `seed-artists.js` script creates 3 test artists and registers them with Addie for payment processing. This enables the Mixtape Creator to distribute payments to artists when users purchase mixtapes.

## Test Artists

The script creates these 3 artists:

1. **Faircamp Artist** (`faircamp@test.mutopia.local`)
   - Receives payments for tracks from Faircamp/Mirlo sources

2. **Sanora Artist** (`sanora@test.mutopia.local`)
   - Receives payments for tracks from Sanora/Jam.coop sources

3. **Sockpuppet Artist** (`sockpuppet@test.mutopia.local`)
   - Receives payments for tracks from Sockpuppet.band sources

## What Each Artist Gets

- **Sessionless Identity**: Public/private keypair for cryptographic authentication
- **Addie User Account**: UUID for payment processing
- **Stripe Customer**: Registered in Stripe for receiving payments
- **Prof Profile**: Artist profile for discovery (optional)

## Prerequisites

1. **Start Mutopia Services**:
   ```bash
   cd /Users/zachbabb/Work/planet-nine/mutopia
   ./start.sh
   ```

2. **Verify Services Are Running**:
   ```bash
   ./test-services.sh
   ```

   Make sure these services are UP:
   - Addie (port 3004)
   - Prof (port 5108)
   - Continuebee (port 5112)

## Running the Seed Script

```bash
cd /Users/zachbabb/Work/planet-nine/mutopia
npm run seed
```

## What Happens

For each artist, the script:

1. **Generates Keypair**:
   ```javascript
   const keys = sessionless.generateKeys();
   // Creates: { publicKey, privateKey }
   ```

2. **Creates Addie User** (`PUT /user/create`):
   ```javascript
   {
     timestamp: "1234567890",
     pubKey: "02a1b2c3...",
     signature: "..."
   }
   // Returns: { uuid, stripeCustomerId }
   ```

3. **Sets Up Stripe Processor** (`PUT /user/:uuid/processor/stripe`):
   ```javascript
   {
     timestamp: "1234567890",
     name: "Faircamp Artist",
     email: "faircamp@test.mutopia.local",
     country: "US",
     signature: "..."
   }
   // Registers artist as Stripe customer
   ```

4. **Creates Prof Profile** (`POST /profiles`):
   ```javascript
   {
     name: "Faircamp Artist",
     email: "faircamp@test.mutopia.local",
     pubKey: "02a1b2c3...",
     uuid: "...",
     source: "faircamp",
     bio: "Test artist from faircamp for Mutopia demo",
     genres: ["Electronic", "Experimental"],
     tags: ["mutopia", "test", "faircamp"]
   }
   ```

## Output

The script saves all artist data to `test-artists.json`:

```json
[
  {
    "name": "Faircamp Artist",
    "email": "faircamp@test.mutopia.local",
    "source": "faircamp",
    "country": "US",
    "uuid": "a1b2c3d4-...",
    "pubKey": "02a1b2c3d4e5f6...",
    "privateKey": "f6e5d4c3b2a1...",
    "stripeCustomerId": "cus_..."
  },
  {
    "name": "Sanora Artist",
    "email": "sanora@test.mutopia.local",
    "source": "sanora",
    "country": "US",
    "uuid": "d4e5f6a1-...",
    "pubKey": "02d4e5f6a1b2...",
    "privateKey": "b2a1f6e5d4...",
    "stripeCustomerId": "cus_..."
  },
  {
    "name": "Sockpuppet Artist",
    "email": "sockpuppet@test.mutopia.local",
    "source": "sockpuppet",
    "country": "US",
    "uuid": "f6a1b2c3-...",
    "pubKey": "02f6a1b2c3d4...",
    "privateKey": "d4c3b2a1f6...",
    "stripeCustomerId": "cus_..."
  }
]
```

## Integration with Mixtape Creator

The Mixtape Creator (`mixtape-creator/app.js`) loads this file and maps content sources to artist pubKeys:

```javascript
// Source mapping in app.js
const sourceMapping = {
  'Mirlo': 'faircamp',     // Mirlo → Faircamp Artist
  'Jam.coop': 'sanora',    // Jam → Sanora Artist
  'Sanora': 'sanora',      // Sanora → Sanora Artist
  'Faircamp': 'faircamp',  // Faircamp → Faircamp Artist
  'Sockpuppet': 'sockpuppet' // Sockpuppet → Sockpuppet Artist
};
```

When a user buys a mixtape:
1. Tracks are grouped by source
2. Each source maps to an artist pubKey
3. Payment is split equally among unique artists
4. Addie processes transfers to each artist's Stripe account

## Payment Flow Example

**User creates mixtape with**:
- 3 tracks from Faircamp/Mirlo → Faircamp Artist
- 2 tracks from Sanora/Jam → Sanora Artist

**Payment split**:
- Total: $5.00
- Faircamp Artist: $2.50
- Sanora Artist: $2.50

**Addie processes**:
```javascript
POST /user/:uuid/processor/stripe/intent
{
  amount: 500, // $5.00 in cents
  payees: [
    { pubKey: "02a1b2c3...", amount: 250 }, // Faircamp Artist
    { pubKey: "02d4e5f6...", amount: 250 }  // Sanora Artist
  ]
}
```

## Troubleshooting

### "Failed to create Addie user"

**Problem**: Addie service not running or not reachable

**Solution**:
```bash
# Check Addie status
curl http://localhost:3004/

# Restart Mutopia services
cd /Users/zachbabb/Work/planet-nine/mutopia
./stop.sh
./start.sh
```

### "Failed to setup Stripe"

**Problem**: Stripe credentials not configured in Addie

**Solution**: Check `docker-compose.yml` has Stripe keys:
```yaml
addie:
  environment:
    STRIPE_KEY: sk_test_REDACTED
    STRIPE_PUBLISHABLE_KEY: pk_test_REDACTED
```

### "Could not create Prof profile"

**Problem**: Prof service not running (non-critical - payments still work)

**Solution**: Verify Prof is running:
```bash
curl http://localhost:5108/
```

## Next Steps

After seeding:

1. **Copy test-artists.json to Mixtape Creator**:
   ```bash
   cp test-artists.json mixtape-creator/
   ```

2. **Visit Mixtape Creator**:
   ```
   http://localhost:3003
   ```

3. **Test Payment Flow**:
   - Add tracks from different sources
   - Create mixtape
   - Checkout with Stripe test card: `4242 4242 4242 4242`
   - Check Stripe Dashboard to see payment splits

4. **Verify Payments in Stripe**:
   - Visit: https://dashboard.stripe.com/test/payments
   - Look for $5.00 payment
   - Check metadata for payee splits
   - Verify transfers to artist accounts

## Security Notes

- **DO NOT commit test-artists.json to git** - Contains private keys
- Test keys only work in Stripe test mode
- For production, artists would register via proper onboarding flow
- Private keys should be stored securely (e.g., encrypted at rest)

## File Structure

```
mutopia/
├── seed-artists.js      # Seeding script
├── package.json         # Dependencies (sessionless-node, node-fetch)
├── test-artists.json    # Generated artist data (gitignored)
├── SEEDING.md          # This file
└── mixtape-creator/
    ├── app.js          # Loads test-artists.json
    └── test-artists.json  # Copy of artist data for frontend
```
