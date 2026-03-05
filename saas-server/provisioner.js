const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PLANS } = require('./db/users');

// File-based persistence for provisioned keys
const DB_PATH = path.join(__dirname, 'db/provisioned_keys.json');

// Ensure db directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Load initial state
let provisionedKeys = {};
try {
    if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        provisionedKeys = JSON.parse(data);
        console.log(`[Provisioner] Loaded ${Object.keys(provisionedKeys).length} keys from disk.`);
    }
} catch (err) {
    console.error('[Provisioner] Failed to load keys:', err.message);
    provisionedKeys = {};
}

function saveToDisk() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(provisionedKeys, null, 2));
    } catch (err) {
        console.error('[Provisioner] Failed to save keys:', err.message);
    }
}

/**
 * Maps a Gumroad product permalink or Stripe price ID to a plan tier.
 * Edit these to match your actual Gumroad/Stripe product IDs.
 */
const PRODUCT_PLAN_MAP = {
    // Gumroad permalink slugs (set in your Gumroad product settings)
    'outreach-studio-pro': 'pro',
    'outreach-studio-agency': 'agency',
    'outreach-studio-free': 'free',

    // Stripe Price IDs (from your Stripe dashboard → Products)
    'price_pro_placeholder': 'pro',
    'price_agency_placeholder': 'agency',
};

function resolvePlan(productId) {
    return PRODUCT_PLAN_MAP[productId] || 'free';
}

function generateApiKey(plan) {
    const prefix = plan === 'agency' ? 'oas-agency' : plan === 'pro' ? 'oas-pro' : 'oas-free';
    const secret = crypto.randomBytes(20).toString('hex');
    return `${prefix}-${secret}`;
}

function provisionKey({ customerEmail, customerName, plan, source, orderId }) {
    const apiKey = generateApiKey(plan);
    const now = new Date();

    provisionedKeys[apiKey] = {
        id: crypto.randomUUID(),
        apiKey,
        email: customerEmail,
        name: customerName || customerEmail,
        plan,
        source, // 'gumroad' | 'stripe'
        orderId,
        usageToday: 0,
        lastReset: now.toDateString(),
        createdAt: now.toISOString(),
        active: true,
    };

    console.log(`[Provisioning] ✅ New ${plan.toUpperCase()} key issued to ${customerEmail}: ${apiKey}`);
    saveToDisk();
    return provisionedKeys[apiKey];
}

function getProvisionedUser(apiKey) {
    return provisionedKeys[apiKey] || null;
}

function getAllKeys() {
    return Object.values(provisionedKeys);
}

module.exports = { provisionKey, getProvisionedUser, getAllKeys, resolvePlan, PRODUCT_PLAN_MAP };
