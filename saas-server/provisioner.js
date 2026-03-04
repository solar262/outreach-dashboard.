const crypto = require('crypto');
const { PLANS } = require('./db/users');

// In-memory provisioned keys store
// In production: replace with a real DB (Supabase, PlanetScale, etc.)
const provisionedKeys = {};

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
    return provisionedKeys[apiKey];
}

function getProvisionedUser(apiKey) {
    return provisionedKeys[apiKey] || null;
}

function getAllKeys() {
    return Object.values(provisionedKeys);
}

module.exports = { provisionKey, getProvisionedUser, getAllKeys, resolvePlan, PRODUCT_PLAN_MAP };
