# Platform Payment Setup

## Overview

This document describes how Mirlo, Jam.coop, and Sanora are set up as Addie customers to receive split payments from the Mixtape Creator.

## Background

When users purchase a mixtape containing tracks from multiple platforms, the payment needs to be split between those platforms. To enable this, each platform must be registered as an Addie customer with:

- A sessionless identity (pubKey/privateKey pair)
- An Addie user account (UUID)
- A Stripe processor account (for receiving payments)

## Setup

### Running the Setup Script

```bash
cd /Users/zachbabb/Work/planet-nine/mutopia
npm run seed-platforms
```

This creates three platform payment accounts:

1. **Mirlo** - Music platform for tracks and streaming
2. **Jam.coop** - Music cooperative platform
3. **Sanora** - Allyabase music infrastructure

### What Gets Created

For each platform:

```javascript
{
  name: "Mirlo",
  email: "platform@mirlo.local",
  source: "mirlo",
  country: "US",
  bio: "Mirlo music platform - track, store, and streaming infrastructure",
  uuid: "6ab082e7-b03c-4d0f-a424-ed164857a61d",        // Addie user ID
  pubKey: "03025f1349fec64ca7c64667363379e19bf...",    // Public key for payments
  privateKey: "607ac52bc4cf7bb8846b127a5f69e13...",    // Private key (keep secret!)
  stripeCustomerId: "cus_..."                          // Stripe customer ID
}
```

### Generated Files

- `test-platforms.json` - Platform credentials (gitignored, contains private keys!)

## Using Platform Accounts in Split Payments

### Example: 3-Way Split

User purchases a $5.00 mixtape with:
- 2 tracks from Mirlo
- 2 tracks from Jam.coop
- 1 track from Sanora

**Payment split:**
- Mirlo: $1.68 (168 cents) - gets the extra penny from rounding
- Jam.coop: $1.66 (166 cents)
- Sanora: $1.66 (166 cents)

### API Call to Addie

```javascript
POST /user/:uuid/processor/stripe/intent
{
  amount: 500,  // $5.00 in cents
  payees: [
    {
      pubKey: "03025f1349fec64ca7c64667363379e19bf...",  // Mirlo
      amount: 168
    },
    {
      pubKey: "0346c8354bda1d518988f67d8869b9eaec0...",  // Jam.coop
      amount: 166
    },
    {
      pubKey: "027eb538601841d6b8e4cb88016e5269bfc...",  // Sanora
      amount: 166
    }
  ]
}
```

## Testing

### Test Split Payment Setup

```bash
npm run test-split
```

This verifies:
- Platform accounts are created
- Addie service is reachable
- Payment splits calculate correctly
- Shows example API calls

## Integration with Mixtape Creator

The Mixtape Creator (`mixtape-creator/app.js`) needs to:

1. **Detect platform sources** for each track in the mixtape
2. **Group tracks by platform** to determine payees
3. **Calculate equal splits** among platforms
4. **Create payment intent** via Addie with platform pubKeys as payees
5. **Process payment** through Stripe

### Example Flow

```javascript
// User's mixtape
const mixtape = [
  { title: "Song A", platform: "mirlo" },
  { title: "Song B", platform: "mirlo" },
  { title: "Song C", platform: "jam" },
  { title: "Song D", platform: "sanora" }
];

// Load platform credentials
const platforms = JSON.parse(fs.readFileSync('test-platforms.json'));

// Determine unique platforms
const uniquePlatforms = [...new Set(mixtape.map(t => t.platform))];
// => ["mirlo", "jam", "sanora"]

// Calculate splits
const splitAmount = Math.floor(500 / uniquePlatforms.length); // 166
const remainder = 500 - (splitAmount * uniquePlatforms.length); // 2

// Build payees
const payees = uniquePlatforms.map((platformName, index) => {
  const platform = platforms.find(p => p.source === platformName);
  return {
    pubKey: platform.pubKey,
    amount: splitAmount + (index === 0 ? remainder : 0)
  };
});

// Create payment intent via Addie
const paymentIntent = await createPaymentIntent(payees);
```

## Platform UUIDs (Current Demo)

| Platform | UUID |
|----------|------|
| **Mirlo** | `6ab082e7-b03c-4d0f-a424-ed164857a61d` |
| **Jam.coop** | `11a7701c-7340-4bd4-a0eb-956f505097eb` |
| **Sanora** | `40d8d0b2-b3c7-47f1-9897-0970b91bee50` |

## Security Notes

⚠️ **IMPORTANT:**

- `test-platforms.json` contains private keys - **NEVER commit to git**
- These are test accounts for demo purposes only
- In production, each platform would manage their own keys securely
- Private keys should be encrypted at rest
- Use environment variables or secret management for production

## Difference from Artist Payments

| Artist Payments | Platform Payments |
|----------------|-------------------|
| `test-artists.json` | `test-platforms.json` |
| Individual creators | Platform infrastructure |
| Faircamp Artist, Sanora Artist, etc. | Mirlo, Jam.coop, Sanora |
| Based on artist name in track metadata | Based on track source/origin |
| `npm run seed` | `npm run seed-platforms` |

Both artists and platforms can be payees in the same transaction!

## Troubleshooting

### "Failed to create Addie user"

**Problem:** Addie service not running

**Solution:**
```bash
docker compose up -d addie
docker compose logs addie
```

### "Stripe processor configured: undefined"

**Problem:** Stripe keys not configured in Addie

**Solution:** Check `docker-compose.yml`:
```yaml
addie:
  environment:
    STRIPE_KEY: sk_test_REDACTED
    STRIPE_PUBLISHABLE_KEY: pk_test_REDACTED
```

### "Could not create Prof profile"

**Problem:** Prof service not running (non-critical)

**Solution:** Prof profiles are optional for payment processing. If needed:
```bash
docker compose up -d prof
```

## Next Steps

1. ✅ Platform accounts created
2. ✅ Ready to use as payees in split transactions
3. 🔜 Update Mixtape Creator to use platform pubKeys
4. 🔜 Test end-to-end payment flow
5. 🔜 Verify payments in Stripe dashboard

## Related Documentation

- [Mutopia README](./README.md)
- [Artist Seeding](./SEEDING.md)
- [Mixtape Creator](./mixtape-creator/README.md)
- [Addie Documentation](/Users/zachbabb/Work/planet-nine/addie/README.md)
