// Mutopia Mixtape Creator
// Integrates with Mirlo, Jam.coop, and Allyabase via Addie payment splits

const CONFIG = {
    ADDIE_URL: 'http://localhost:3004', // Addie service
    MIRLO_API: 'http://localhost:3001/v1',
    JAM_API: 'http://localhost:3002',
    SANORA_API: 'http://localhost:9090',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_REDACTED',
    MIXTAPE_PRICE: 500, // $5.00 in cents
};

// State
let currentSource = 'mirlo';
let allTracks = [];
let mixtape = loadMixtape();
let stripe = null;
let cardElement = null;
let platformRegistry = null; // Will load from test-platforms.json

// Load platform registry from seeded test platforms
async function loadPlatformRegistry() {
    try {
        const response = await fetch('./test-platforms.json');
        if (!response.ok) {
            console.warn('Could not load test-platforms.json, using fallback');
            return null;
        }
        const platforms = await response.json();

        // Create mapping from source to platform pubKey
        const registry = {};
        platforms.forEach(platform => {
            registry[platform.source] = {
                name: platform.name,
                pubKey: platform.pubKey,
                uuid: platform.uuid
            };
        });

        console.log('Loaded platform registry:', registry);
        return registry;
    } catch (error) {
        console.warn('Error loading platform registry:', error);
        return null;
    }
}

// Initialize Stripe
function initStripe() {
    stripe = Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
    const elements = stripe.elements();
    cardElement = elements.create('card');
    cardElement.mount('#card-element');

    cardElement.on('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });
}

// Load mixtape from localStorage
function loadMixtape() {
    const saved = localStorage.getItem('mutopia_mixtape');
    return saved ? JSON.parse(saved) : [];
}

// Save mixtape to localStorage
function saveMixtape() {
    localStorage.setItem('mutopia_mixtape', JSON.stringify(mixtape));
    updateMixtapeUI();
}

// Fetch tracks from Canimus feed
async function fetchCanimusTracks(feedUrl, sourceName) {
    try {
        // Add cache-busting parameter to prevent stale results
        const cacheBuster = `?_=${Date.now()}`;
        const urlWithCacheBuster = feedUrl.includes('?')
            ? `${feedUrl}&_=${Date.now()}`
            : `${feedUrl}${cacheBuster}`;

        const response = await fetch(urlWithCacheBuster, {
            cache: 'no-store'  // Disable caching
        });
        if (!response.ok) throw new Error(`Failed to fetch ${sourceName} feed`);

        const feed = await response.json();
        const tracks = [];

        // Parse Canimus feed structure
        if (feed.children) {
            feed.children.forEach(artist => {
                if (artist.type === 'artist' && artist.children) {
                    artist.children.forEach(album => {
                        if (album.type === 'album' && album.children) {
                            album.children.forEach(track => {
                                if (track.type === 'track') {
                                    // Extract audio URL from media array OR url field
                                    let audioUrl = null;
                                    if (track.media && track.media.length > 0) {
                                        const audioMedia = track.media.find(m =>
                                            m.type.startsWith('audio/')
                                        );
                                        audioUrl = audioMedia ? audioMedia.src : null;
                                    } else if (track.url) {
                                        // Fallback to direct url field (Sanora format)
                                        audioUrl = track.url;
                                    }

                                    const artistName = track.Artist || artist.name || 'Unknown Artist';
                                    tracks.push({
                                        id: `${sourceName}-${track.name}-${Date.now()}-${Math.random()}`,
                                        title: track.name,
                                        artist: artistName,
                                        album: track.Album || album.name || 'Unknown Album',
                                        source: sourceName,
                                        audioUrl: audioUrl,
                                        // Get platform pubKey for revenue split
                                        platformPubKey: getPlatformPubKey(sourceName)
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }

        return tracks;
    } catch (error) {
        console.error(`Error fetching ${sourceName} tracks:`, error);
        showError(`Failed to load ${sourceName} tracks: ${error.message}`);
        return [];
    }
}

// Get platform pubKey based on source
function getPlatformPubKey(source) {
    // Map source names to platform registry keys
    const sourceMapping = {
        'Mirlo': 'mirlo',
        'Jam.coop': 'jam',
        'Sanora': 'sanora',
        'Faircamp': 'mirlo',  // Faircamp content is served via Mirlo
        'Sockpuppet': 'sanora' // Sockpuppet content is served via Sanora
    };

    const sourceKey = sourceMapping[source] || source.toLowerCase();

    if (platformRegistry && platformRegistry[sourceKey]) {
        return platformRegistry[sourceKey].pubKey;
    }

    // Fallback - should not happen if platforms are properly seeded
    console.error(`No platform registry entry for source: ${source} (mapped to ${sourceKey})`);
    console.error('Available platforms:', platformRegistry);
    return null;
}

// Fetch tracks from Mirlo API
async function fetchMirloTracks(sourceName) {
    try {
        const response = await fetch(`${CONFIG.MIRLO_API}/trackGroups?take=100`, {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Failed to fetch from Mirlo API`);

        const data = await response.json();
        const tracks = [];

        // Convert Mirlo trackGroups to track list
        data.results.forEach(trackGroup => {
            if (trackGroup.tracks && trackGroup.tracks.length > 0) {
                trackGroup.tracks.forEach(track => {
                    tracks.push({
                        id: `${sourceName}-${track.id}`,
                        title: track.title,
                        artist: trackGroup.artist?.name || 'Unknown Artist',
                        album: trackGroup.title || 'Unknown Album',
                        source: sourceName,
                        audioUrl: track.audio?.url || null,
                        platformPubKey: getPlatformPubKey(sourceName)
                    });
                });
            }
        });

        return tracks;
    } catch (error) {
        console.error(`Error fetching ${sourceName} tracks:`, error);
        showError(`Failed to load ${sourceName} tracks: ${error.message}`);
        return [];
    }
}

// Fetch tracks based on source
async function fetchTracks(source) {
    showLoading();

    try {
        let tracks = [];

        switch (source) {
            case 'mirlo':
                // Fetch from Mirlo API - shows all ingested Canimus feeds
                tracks = await fetchMirloTracks('Mirlo');
                break;

            case 'jam':
                // Fetch from Jam.coop - shows same data for demo
                tracks = await fetchMirloTracks('Jam.coop');
                break;

            case 'sanora':
                // Fetch from Sanora/Allyabase - shows same data for demo
                tracks = await fetchMirloTracks('Sanora');
                break;
        }

        allTracks = tracks;
        hideLoading();
        renderTracks(tracks);
    } catch (error) {
        hideLoading();
        showError(`Failed to fetch tracks: ${error.message}`);
    }
}

// Render tracks in the browser
function renderTracks(tracks) {
    const trackList = document.getElementById('track-list');

    if (tracks.length === 0) {
        trackList.innerHTML = '<p class="empty-state">No tracks found</p>';
        return;
    }

    trackList.innerHTML = tracks.map(track => {
        const isInMixtape = mixtape.some(t => t.id === track.id);

        return `
            <div class="track-item">
                <div class="track-info">
                    <div class="track-title">${escapeHtml(track.title)}</div>
                    <div class="track-artist">${escapeHtml(track.artist)}</div>
                    <span class="track-source">${escapeHtml(track.source)}</span>
                </div>
                <button
                    class="add-btn"
                    data-track-id="${track.id}"
                    ${isInMixtape ? 'disabled' : ''}
                >
                    ${isInMixtape ? 'Added' : 'Add to Mixtape'}
                </button>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const trackId = btn.dataset.trackId;
            const track = allTracks.find(t => t.id === trackId);
            if (track) addToMixtape(track);
        });
    });
}

// Add track to mixtape
function addToMixtape(track) {
    if (!mixtape.some(t => t.id === track.id)) {
        mixtape.push(track);
        saveMixtape();
        renderTracks(allTracks); // Re-render to update button states
    }
}

// Remove track from mixtape
function removeFromMixtape(trackId) {
    mixtape = mixtape.filter(t => t.id !== trackId);
    saveMixtape();
    renderTracks(allTracks); // Re-render to update button states
}

// Update mixtape UI
function updateMixtapeUI() {
    const mixtapeList = document.getElementById('mixtape-list');
    const trackCount = document.getElementById('track-count');
    const checkoutBtn = document.getElementById('checkout-btn');

    trackCount.textContent = mixtape.length;

    if (mixtape.length === 0) {
        mixtapeList.innerHTML = '<p class="empty-state">Add tracks to start building your mixtape!</p>';
        checkoutBtn.disabled = true;
    } else {
        mixtapeList.innerHTML = mixtape.map(track => `
            <div class="mixtape-item">
                <div class="mixtape-item-info">
                    <div class="mixtape-item-title">${escapeHtml(track.title)}</div>
                    <div class="mixtape-item-artist">${escapeHtml(track.artist)} <span class="mixtape-source">via ${escapeHtml(track.source)}</span></div>
                </div>
                <button class="remove-btn" data-track-id="${track.id}">×</button>
            </div>
        `).join('');

        checkoutBtn.disabled = false;

        // Add remove handlers
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                removeFromMixtape(btn.dataset.trackId);
            });
        });
    }

    // Update split info
    const uniqueArtists = [...new Set(mixtape.map(t => t.artist))];
    const artistCount = document.getElementById('artist-count');
    const splitInfo = document.getElementById('split-info');

    artistCount.textContent = uniqueArtists.length;

    if (uniqueArtists.length > 0) {
        const splitAmount = (CONFIG.MIXTAPE_PRICE / 100 / uniqueArtists.length).toFixed(2);
        splitInfo.textContent = `$${splitAmount} per artist`;
    } else {
        splitInfo.textContent = 'Split between 0 artists';
    }
}

// Calculate payment splits by platform (not by artist)
function calculatePaymentSplits() {
    // Group tracks by source to get unique platforms
    const platformMap = new Map();

    mixtape.forEach(track => {
        if (!platformMap.has(track.source)) {
            platformMap.set(track.source, {
                source: track.source,
                pubKey: track.platformPubKey,
                tracks: []
            });
        }
        platformMap.get(track.source).tracks.push(track);
    });

    const uniquePlatforms = Array.from(platformMap.values());
    const amountPerPlatform = Math.floor(CONFIG.MIXTAPE_PRICE / uniquePlatforms.length);
    const remainder = CONFIG.MIXTAPE_PRICE % uniquePlatforms.length;

    const payees = uniquePlatforms.map((platform, index) => ({
        pubKey: platform.pubKey,
        name: platform.source,
        amount: index === 0 ? amountPerPlatform + remainder : amountPerPlatform
    }));

    console.log('Payment split by platforms:', payees);
    return payees;
}

// Create payment intent with Addie (demo endpoint)
async function createPaymentIntent() {
    const payees = calculatePaymentSplits();

    console.log('Creating payment intent with', payees.length, 'platform splits:', payees);

    // Create payment intent via Addie demo endpoint
    const response = await fetch(`${CONFIG.ADDIE_URL}/demo/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount: CONFIG.MIXTAPE_PRICE,
            currency: 'usd',
            description: `Mutopia Mixtape - ${mixtape.length} tracks`,
            payees: payees.map(p => ({
                pubKey: p.pubKey,
                amount: p.amount,
                name: p.name
            }))
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment intent');
    }

    const data = await response.json();
    console.log('Payment intent created successfully');
    return data.clientSecret;
}

// Handle checkout
async function handleCheckout() {
    const modal = document.getElementById('checkout-modal');
    const modalTrackCount = document.getElementById('modal-track-count');
    const modalArtists = document.getElementById('modal-artists');

    // Update modal content
    modalTrackCount.textContent = mixtape.length;

    const uniqueArtists = [...new Set(mixtape.map(t => t.artist))];
    modalArtists.textContent = `Artists: ${uniqueArtists.join(', ')}`;

    // Show modal
    modal.style.display = 'flex';
}

// Handle payment submission
async function handlePayment() {
    const submitBtn = document.getElementById('submit-payment');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        // Create payment intent with Addie
        const clientSecret = await createPaymentIntent();

        // Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
            },
        });

        if (error) {
            throw new Error(error.message);
        }

        if (paymentIntent.status === 'succeeded') {
            console.log('Payment succeeded! Payment intent ID:', paymentIntent.id);
            console.log('Now processing transfers to platform Connected Accounts...');

            // Process transfers to platforms
            try {
                const transferResponse = await fetch(`${CONFIG.ADDIE_URL}/payment/${paymentIntent.id}/process-connected-transfers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (transferResponse.ok) {
                    const transferResult = await transferResponse.json();
                    console.log('✅ Transfers processed successfully!', transferResult);
                    console.log(`Created ${transferResult.totalTransfers} transfers to platform accounts`);
                    console.log('Check Stripe Dashboard to see the transfers!');
                } else {
                    const error = await transferResponse.json();
                    console.error('⚠️ Transfer processing failed:', error);
                }
            } catch (error) {
                console.error('⚠️ Error processing transfers:', error);
            }

            // Show success
            document.getElementById('payment-form').style.display = 'none';
            document.getElementById('payment-success').style.display = 'block';

            // Clear mixtape
            mixtape = [];
            saveMixtape();
        }
    } catch (error) {
        document.getElementById('card-errors').textContent = error.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Pay $5.00';
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('track-list').innerHTML = '';
    document.getElementById('error').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Load platform registry first
    platformRegistry = await loadPlatformRegistry();

    // Initialize Stripe
    initStripe();

    // Source tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSource = btn.dataset.source;
            fetchTracks(currentSource);
        });
    });

    // Search
    document.getElementById('search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allTracks.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query)
        );
        renderTracks(filtered);
    });

    // Checkout button
    document.getElementById('checkout-btn').addEventListener('click', handleCheckout);

    // Modal close
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('checkout-modal').style.display = 'none';
    });

    // Payment submission
    document.getElementById('submit-payment').addEventListener('click', handlePayment);

    // Initial load
    fetchTracks(currentSource);
    updateMixtapeUI();
});
