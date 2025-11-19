# Mutopia Mixtape Creator

A barebones product website that lets you create custom mixtapes by selecting tracks from Mirlo, Jam.coop, and Sanora (Allyabase). Purchase a mixtape for $5, with payment automatically split between all contributing artists and platforms using Addie payment infrastructure.

## Features

- Browse tracks from multiple music platforms (Mirlo, Jam.coop, Sanora)
- Create custom mixtapes by selecting tracks across platforms
- $5 fixed price per mixtape
- Automatic payment splits to all artists via Addie
- Stripe integration for secure payments
- LocalStorage persistence for your mixtape

## How It Works

### Track Browsing
1. Switch between sources using the tabs (Mirlo, Jam.coop, Sanora)
2. Tracks are fetched from each platform's Canimus feed
3. Search tracks by title or artist name
4. Click "Add to Mixtape" to add tracks to your collection

### Payment Splits
- The $5 payment is automatically divided equally among all **unique artists** in your mixtape
- Each artist must be an Addie user with an allyabase instance
- Payment flows through Addie's payment split infrastructure
- Powered by Stripe for secure card processing

### Canimus Feed Sources

The mixtape creator fetches tracks from three Canimus feeds:

| Source | Feed URL | Description |
|--------|----------|-------------|
| **Sanora** | `http://sanora:9090/feeds/canimus-feed.json` | Books, albums, blog posts from Allyabase |
| **Faircamp** | `http://faircamp:8000/canimus.json` | User-uploaded music catalog |
| **Sockpuppet.band** | `https://sockpuppet.band/canimus.json` | Self-hosted music example |

## Configuration

### Environment Variables (in app.js)

```javascript
const CONFIG = {
    ADDIE_URL: 'http://localhost:3004',  // Addie service URL
    MIRLO_API: 'http://localhost:3001/v1',  // Mirlo API
    JAM_API: 'http://localhost:3002',  // Jam.coop API
    SANORA_API: 'http://localhost:9090',  // Sanora API
    STRIPE_PUBLISHABLE_KEY: 'pk_test_REDACTED',
    MIXTAPE_PRICE: 500,  // $5.00 in cents
};
```

### Stripe Keys

**Test Mode Keys** (already configured):
- **Publishable Key**: `pk_test_REDACTED`
- **Secret Key**: `sk_test_REDACTED` (used by Addie)

## Usage

### Via Docker Compose

The mixtape creator is included in the Mutopia Docker Compose stack:

```bash
# Start all Mutopia services including mixtape creator
cd /Users/zachbabb/Work/planet-nine/mutopia
./start.sh

# Access the mixtape creator
open http://localhost:3003
```

### Standalone (Development)

```bash
# Serve with any static file server
cd /Users/zachbabb/Work/planet-nine/mutopia/mixtape-creator
python3 -m http.server 8080

# Or use npx
npx serve .

# Access at http://localhost:8080
```

## Requirements

### Running Services

The mixtape creator requires these services to be running (all included in the Mutopia Docker Compose stack):

1. **Sanora** (port 9090) - Canimus feed provider
2. **Faircamp** (port 8000) - Canimus feed provider
3. **Mirlo API** (port 3001) - Optional additional tracks
4. **Jam.coop** (port 3002) - Optional additional tracks
5. **Addie** (port 3004) - Payment processing with Stripe integration
6. **Prof** (port 5108) - Profile/PII service
7. **Continuebee** (port 5112) - Authentication service

All services are automatically started via `./start.sh` in the Mutopia directory.

### Artist Requirements

For artists to receive payments:
- Must have an Addie user account
- Must have an allyabase instance configured
- Must have their Addie public key (pubKey) associated with their artist name

**Note**: Currently using mock pubKeys generated from artist names. In production, these would be fetched from the Prof service via Addie user registry.

## Architecture

### Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                 Mixtape Creator (Browser)                 │
│                                                           │
│  1. Fetch Canimus feeds from sources                     │
│  2. User builds mixtape from tracks                      │
│  3. Calculate payment splits (equal division)            │
│  4. Create Stripe checkout                               │
│  5. Process payment via Addie                            │
└──────────┬────────────────────────────┬──────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐
│   Canimus Feeds      │    │   Addie Service      │
│                      │    │   (localhost:3004)   │
│ - Sanora (9090)      │    │                      │
│ - Faircamp (8000)    │    │ 1. Create payment    │
│ - Sockpuppet.band    │    │ 2. Split to payees   │
│                      │    │ 3. Process transfers │
└──────────────────────┘    └──────────┬───────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │   Stripe Connect     │
                            │                      │
                            │ - Charge customer    │
                            │ - Pay artists        │
                            └──────────────────────┘
```

### Payment Split Calculation

```javascript
// Example: Mixtape with 3 tracks from 2 unique artists
// Track 1: Artist A
// Track 2: Artist A
// Track 3: Artist B

// Unique artists: ["Artist A", "Artist B"]
// Amount: $5.00 (500 cents)
// Split: 500 / 2 = 250 cents ($2.50 per artist)

const payees = [
  { pubKey: "artistA_pubkey", amount: 250 },
  { pubKey: "artistB_pubkey", amount: 250 }
];
```

## API Endpoints Used

### Canimus Feeds (GET - Read Only)
- `GET http://sanora:9090/feeds/canimus-feed.json`
- `GET http://faircamp:8000/canimus.json`
- `GET https://sockpuppet.band/canimus.json`

### Addie Payment Processing (POST)
- `POST http://localhost:3004/payment/create` - Create payment intent with splits
- `POST http://localhost:3004/payment/{paymentId}/process-transfers` - Process transfers to artists

### Stripe Client-Side
- `stripe.confirmCardPayment(clientSecret)` - Confirm payment with card

## File Structure

```
mixtape-creator/
├── index.html       # Main HTML structure
├── styles.css       # Responsive CSS with gradient background
├── app.js          # Core application logic
└── README.md       # This file
```

### Key Functions in app.js

- `fetchCanimusTracks(feedUrl, sourceName)` - Fetch and parse Canimus feeds
- `calculatePaymentSplits()` - Calculate equal splits across unique artists
- `createPaymentIntent()` - Create Stripe payment intent via Addie
- `handlePayment()` - Process Stripe checkout and transfer funds
- `addToMixtape(track)` / `removeFromMixtape(trackId)` - Manage mixtape state
- `saveMixtape()` / `loadMixtape()` - LocalStorage persistence

## Development Notes

### Mock Data

The current implementation uses **mock pubKeys** generated from artist names:

```javascript
function generateMockPubKey(artistName) {
    const hash = artistName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `mock_pubkey_${hash}_${artistName.replace(/\s+/g, '_').toLowerCase()}`;
}
```

### Production Considerations

For production deployment:

1. **Real Artist PubKeys**: Fetch from Addie user registry instead of generating mocks
2. **Error Handling**: Add comprehensive error handling for network failures
3. **CORS Configuration**: Ensure all services allow requests from mixtape creator origin
4. **Rate Limiting**: Implement rate limiting for payment creation
5. **Analytics**: Track mixtape creation and purchase metrics
6. **Mobile Optimization**: Test and optimize for mobile browsers
7. **Accessibility**: Add ARIA labels and keyboard navigation
8. **Security**: Validate all inputs and sanitize user data

### CORS Requirements

The mixtape creator makes cross-origin requests to:
- Sanora (port 9090)
- Faircamp (port 8000)
- Mirlo API (port 3001)
- Jam.coop (port 3002)
- Addie (port 3004)

Each service must include CORS headers allowing requests from `http://localhost:3003` (or the production domain).

## Testing

### Manual Testing Steps

1. **Start all services**:
   ```bash
   cd /Users/zachbabb/Work/planet-nine/mutopia
   ./start.sh
   ```

2. **Verify Canimus feeds are accessible**:
   ```bash
   curl http://localhost:9090/feeds/canimus-feed.json | jq '.type'
   curl http://localhost:8000/canimus.json | jq '.type'
   ```

3. **Access mixtape creator**:
   ```
   http://localhost:3003
   ```

4. **Test track browsing**:
   - Switch between Mirlo, Jam.coop, Sanora tabs
   - Verify tracks load from each source
   - Test search functionality

5. **Test mixtape building**:
   - Add tracks from different sources
   - Verify track count updates
   - Check payment split calculation
   - Remove tracks and verify updates

6. **Test checkout (requires Addie)**:
   - Click "Checkout with Stripe"
   - Verify modal displays correctly
   - Use Stripe test card: `4242 4242 4242 4242`
   - Verify payment success message

### Test Card Numbers

Use these Stripe test cards for testing:

| Card Number | Behavior |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

Any future expiration date and CVC will work with test cards.

## Troubleshooting

### "No tracks found"
- Verify Canimus feeds are accessible
- Check browser console for CORS errors
- Ensure Sanora/Faircamp services are running

### Payment fails
- Verify Addie service is running on port 3004
- Check Addie has correct Stripe secret key configured
- Verify artists have valid pubKeys in Addie

### CORS errors
- Configure CORS headers on backend services
- Check browser console for specific origin issues
- Ensure all services allow `http://localhost:3003`

## Future Enhancements

- [ ] User accounts and saved mixtapes
- [ ] Download mixtape as M3U playlist
- [ ] Share mixtapes with custom URLs
- [ ] Mixtape artwork generation
- [ ] Variable pricing with artist splits
- [ ] Platform fee configuration
- [ ] Artist verification and onboarding flow
- [ ] Analytics dashboard for artists
- [ ] Multiple payment methods (crypto, PayPal)
- [ ] Mixtape preview before purchase

## License

Part of the Mutopia project. See main Mutopia README for license information.

## Related Documentation

- [Mutopia README](/Users/zachbabb/Work/planet-nine/mutopia/README.md)
- [Canimus Integration Guide](/Users/zachbabb/Work/planet-nine/mutopia/CANIMUS-INTEGRATION.md)
- [Canimus Specification](https://github.com/PlaidWeb/Canimus)
- [Addie Documentation](/Users/zachbabb/Work/planet-nine/addie/README.md)
