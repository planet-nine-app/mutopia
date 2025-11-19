# Connected Account Transfers for Platform Revenue Splits

## Overview

Mirlo, Jam.coop, and Sanora are now set up as **Stripe Connected Accounts** to receive revenue splits from Mixtape purchases. This enables automatic payment distribution when users buy mixtapes containing tracks from multiple platforms.

## Setup Complete

### Platforms Created
All three platforms have been registered as Addie users with Stripe Connected Accounts:

| Platform | UUID | Stripe Account ID |
|----------|------|-------------------|
| **Mirlo** | `05580c5a-7c53-4dcb-8a63-6e310b6f9753` | `acct_1SVGeNETLeATxV85` |
| **Jam.coop** | `9f400973-ef25-484d-9d2d-c08f21b456aa` | `acct_1SVGeQIH5fyyVU4k` |
| **Sanora** | `36e12a74-652d-4240-912b-f410eb5d798a` | `acct_1SVGeTItIQOqzSHm` |

### Connected Account Capabilities
Each platform's Stripe Connected Account has:
- **Transfer capability**: Can receive transfers from payments
- **Controller fees**: Application pays fees
- **Controller losses**: Application handles chargebacks
- **No dashboard access**: Platforms don't need Stripe logins

## How It Works

### Payment Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. User purchases $5 mixtape with tracks from:         │
│    - 2 tracks from Mirlo                                │
│    - 2 tracks from Jam.coop                             │
│    - 1 track from Sanora                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Mixtape Creator creates payment intent via Addie    │
│    POST /demo/payment/create                            │
│    {                                                    │
│      amount: 500,                                       │
│      payees: [                                          │
│        {pubKey: "mirlo_key", amount: 168},             │
│        {pubKey: "jam_key", amount: 166},               │
│        {pubKey: "sanora_key", amount: 166}             │
│      ]                                                  │
│    }                                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Stripe payment intent created with:                  │
│    - amount: $5.00                                      │
│    - transfer_group: "mutopia_1234567890"               │
│    - metadata: {                                        │
│        payee_count: "3",                                │
│        payee_0_pubkey: "mirlo_key",                     │
│        payee_0_amount: "168",                           │
│        payee_0_name: "Mirlo",                           │
│        ...                                              │
│      }                                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. User confirms payment with card                      │
│    → Payment status: succeeded                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Mixtape Creator triggers transfer processing         │
│    POST /payment/:id/process-connected-transfers        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Addie processes transfers:                           │
│    - Looks up each payee's pubKey → stripeAccountId    │
│    - Creates transfer to each Connected Account:        │
│      • Transfer $1.68 to Mirlo (acct_1SVGeN...)        │
│      • Transfer $1.66 to Jam (acct_1SVGeQ...)          │
│      • Transfer $1.66 to Sanora (acct_1SVGeT...)       │
│    - All linked by transfer_group                       │
└─────────────────────────────────────────────────────────┘
```

### Transfer Group Linking

The `transfer_group` field ensures all related transfers appear together in Stripe Dashboard:

```
Payment Intent (pi_abc123)
  ├─ transfer_group: "mutopia_1234567890"
  ├─ amount: $5.00
  └─ metadata: {payees split info}

Transfer 1 (tr_xyz789)
  ├─ transfer_group: "mutopia_1234567890"  ← Links to payment
  ├─ amount: $1.68
  ├─ destination: acct_1SVGeNETLeATxV85 (Mirlo)
  └─ description: "Mutopia Mixtape - Revenue split to Mirlo"

Transfer 2 (tr_def456)
  ├─ transfer_group: "mutopia_1234567890"  ← Links to payment
  ├─ amount: $1.66
  ├─ destination: acct_1SVGeQIH5fyyVU4k (Jam.coop)
  └─ description: "Mutopia Mixtape - Revenue split to Jam.coop"

Transfer 3 (tr_ghi123)
  ├─ transfer_group: "mutopia_1234567890"  ← Links to payment
  ├─ amount: $1.66
  ├─ destination: acct_1SVGeTItIQOqzSHm (Sanora)
  └─ description: "Mutopia Mixtape - Revenue split to Sanora"
```

## New Addie Endpoints

### POST /payment/:paymentIntentId/process-connected-transfers

Processes transfers to Stripe Connected Accounts after payment succeeds.

**Request**: (No body required)

**Response**:
```json
{
  "success": true,
  "transfers": [
    {
      "pubKey": "0268aa20a538c799...",
      "name": "Mirlo",
      "amount": 168,
      "transferId": "tr_xyz789",
      "destination": "acct_1SVGeNETLeATxV85"
    },
    {
      "pubKey": "0213c94a50586fc5...",
      "name": "Jam.coop",
      "amount": 166,
      "transferId": "tr_def456",
      "destination": "acct_1SVGeQIH5fyyVU4k"
    },
    {
      "pubKey": "022ddeba0c5bd4af...",
      "name": "Sanora",
      "amount": 166,
      "transferId": "tr_ghi123",
      "destination": "acct_1SVGeTItIQOqzSHm"
    }
  ],
  "paymentIntentId": "pi_abc123",
  "totalTransfers": 3,
  "failedTransfers": 0
}
```

**Implementation**: `/addie/src/server/node/src/processors/stripe-connected-transfers.js`

## Differences from Payout Cards

| Feature | Connected Accounts | Payout Cards |
|---------|-------------------|--------------|
| **Use Case** | Platform revenue splits | Affiliate commissions |
| **User Field** | `stripeAccountId` | `stripePayoutCardId` |
| **Endpoint** | `/process-connected-transfers` | `/process-transfers` |
| **Stripe Method** | `stripe.transfers.create()` with destination account | `stripe.transfers.create()` with destination card |
| **Payout Speed** | 2-3 business days | ~30 minutes (instant) |
| **Fee** | 0.25% per transfer | 1.5% per payout |
| **Setup** | Requires KYC for recipient | Just save debit card |
| **Best For** | Large platforms receiving revenue | Individual affiliates getting commissions |

## Testing

### 1. Verify Platforms Have Connected Accounts

```bash
cd /Users/zachbabb/Work/planet-nine/mutopia
node verify-platform-accounts.js
```

Expected output:
```
✅ All platforms have Stripe Connected Accounts!
Transfers should work correctly.
```

### 2. Test Payment and Transfer Flow

1. **Open Mixtape Creator**: http://localhost:3003
2. **Add tracks from different sources** (Mirlo, Jam, Sanora)
3. **Checkout** with Stripe test card: `4242 4242 4242 4242`
4. **Check browser console** for transfer processing logs
5. **Check Stripe Dashboard**:
   - Navigate to Payments → find your $5.00 payment
   - Click payment → see metadata with payee splits
   - Navigate to Transfers → see 3 transfers linked by transfer_group
   - Each transfer shows destination Connected Account

### 3. Verify Transfer Group Linking

In Stripe Dashboard:
1. Copy the `transfer_group` value from payment metadata
2. Search Transfers for that transfer_group
3. Should see all 3 transfers grouped together
4. Each transfer links back to the original payment

## Troubleshooting

### "No Stripe Connected Account" Error

**Problem**: Platform pubKey not found or no `stripeAccountId`

**Solution**:
```bash
# Re-run platform seeding
npm run seed-platforms

# Verify accounts created
node verify-platform-accounts.js
```

### Transfers Not Appearing in Dashboard

**Problem**: Transfers not created after payment

**Solution**:
1. Check Addie logs: `docker compose logs addie --tail=100`
2. Verify payment status is "succeeded"
3. Check browser console for transfer API response
4. Manually trigger: `POST /payment/:id/process-connected-transfers`

### Wrong Transfer Amounts

**Problem**: Split calculation incorrect

**Solution**: Check Mixtape Creator payment intent creation - amounts should match number of unique platforms in mixtape, with remainder going to first platform.

### "Your destination account needs to have at least one enabled: transfers" Error

**Problem**: Connected Accounts show `transfers: inactive` capability

**Symptoms**:
```
failedTransfers: 3
transfers: [
  {error: "Your destination account needs to have at least one enabled: transfers, crypto_transfers, legacy_payments"}
]
```

**Root Cause**: Stripe Connected Accounts in test mode need proper business information to activate the `transfers` capability.

**Solution**:

1. **Check account capabilities**:
```bash
cd /Users/zachbabb/Work/planet-nine/mutopia
node check-account-capabilities.js
```

If you see `❌ transfers: inactive`, the accounts need to be updated.

2. **Update accounts with proper business info**:
```bash
node update-account-capabilities.js
```

This script updates existing accounts with:
- `business_type: 'company'` (not 'individual')
- `tax_id: '000000000'` (Stripe test tax ID)
- `company.address.line1: 'address_full_match'` (bypasses verification in test mode)
- `business_profile.url: 'https://allyabase.com'` (valid URL required)
- `business_profile.mcc: '5734'` (merchant category code)

3. **Verify activation**:
```bash
node check-account-capabilities.js
```

Should now show:
```
✅ transfers: active
Charges Enabled: true
Payouts Enabled: true
Requirements: 0 items due
```

4. **Add external bank accounts** (if not already done):
```bash
node setup-platform-payout-cards.js
```

**Critical Details**:
- **DO NOT** use `tax_id_provided: true` - use `tax_id: '000000000'` instead
- **DO NOT** use `'https://example.com'` - use a real URL like `'https://allyabase.com'`
- Business type MUST be `'company'` for test mode (individual requires more KYC)
- The special address `'address_full_match'` tells Stripe to bypass address verification

**Updated Account Creation Code** (`/addie/src/server/node/src/processors/stripe.js:32-74`):
```javascript
putStripeAccount: async (foundUser, country, name, email, ip) => {
  const account = await stripeSDK.accounts.create({
    country: country,
    email: email,
    business_type: 'company',  // NOT 'individual'
    company: {
      name: name,
      tax_id: '000000000',  // NOT tax_id_provided: true
      address: {
        line1: 'address_full_match',  // Special test value
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94102',
        country: country
      }
    },
    business_profile: {
      mcc: '5734',
      url: 'https://allyabase.com'  // Real URL, NOT 'https://example.com'
    },
    tos_acceptance: {
      date: Math.floor((new Date().getTime()) / 1000),
      ip: ip,
      service_agreement: 'full'
    },
    capabilities: {
      transfers: {
        requested: true
      }
    },
    controller: {
      fees: { payer: 'application' },
      losses: { payments: 'application' },
      requirement_collection: 'application',
      stripe_dashboard: { type: 'none' }
    }
  });
}

## Files Modified

### Addie Backend
- `/addie/src/server/node/addie.js` - Added `/process-connected-transfers` endpoint
- `/addie/src/server/node/src/processors/stripe-connected-transfers.js` - New transfer processor

### Mutopia
- `/mutopia/seed-platforms.js` - Creates platforms with Connected Accounts
- `/mutopia/mixtape-creator/app.js` - Calls transfer endpoint after payment
- `/mutopia/test-platforms.json` - Platform credentials with `stripeAccountId`

## Next Steps

1. ✅ Platforms created with Connected Accounts
2. ✅ Transfer processing endpoint implemented
3. ✅ Mixtape Creator integrated
4. ✅ Test end-to-end payment flow - **WORKING!**
5. ✅ Verify transfers in Stripe Dashboard - **WORKING!**
6. 🔜 Set up Stripe webhook for automatic transfer processing (optional)

## Webhook Integration (Future)

For production, set up a Stripe webhook to automatically process transfers when payment succeeds:

```javascript
// Stripe webhook handler
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    // Automatically process transfers
    await stripeConnectedTransfers.processConnectedAccountTransfers(paymentIntent.id);
  }

  res.send({received: true});
});
```

This eliminates the need for manual transfer triggering from the client.

## Security Notes

- ⚠️ **IMPORTANT**: `test-platforms.json` contains private keys - **NEVER commit to git**
- Test accounts only work in Stripe test mode
- For production, each platform would manage their own keys securely
- Connected Account IDs are safe to log/display (unlike private keys)

## Summary

The platforms are now fully set up to receive revenue splits via Stripe Connected Accounts. When a user purchases a mixtape:

1. Payment intent created with `transfer_group` and payee metadata
2. User confirms payment with card
3. Mixtape Creator calls `/process-connected-transfers`
4. Addie creates transfers to each platform's Connected Account
5. All transfers linked by `transfer_group` for easy tracking
6. Transfers appear in Stripe Dashboard with full audit trail

**Ready to test!** Visit http://localhost:3003 and purchase a mixtape to see the transfers in action.
