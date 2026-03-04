/**
 * AI Outreach Studio — In-Memory User Store
 * Tracks API keys, plan tiers, and daily usage limits.
 */

const PLANS = {
    free: { name: 'Free', dailyLimit: 5, price: 0 },
    pro: { name: 'Pro', dailyLimit: 500, price: 29 },
    agency: { name: 'Agency', dailyLimit: Infinity, price: 99 },
};

// Demo API keys — in production, replace with a real DB + Stripe webhooks
const users = {
    'free-demo-key-001': {
        id: 'u001',
        name: 'Free User',
        email: 'free@demo.com',
        plan: 'free',
        usageToday: 0,
        lastReset: new Date().toDateString(),
    },
    'pro-demo-key-001': {
        id: 'u002',
        name: 'Pro User',
        email: 'pro@demo.com',
        plan: 'pro',
        usageToday: 0,
        lastReset: new Date().toDateString(),
    },
    'agency-demo-key-001': {
        id: 'u003',
        name: 'Agency User',
        email: 'agency@demo.com',
        plan: 'agency',
        usageToday: 0,
        lastReset: new Date().toDateString(),
    },
};

function getUser(apiKey) {
    return users[apiKey] || null;
}

function resetIfNewDay(user) {
    const today = new Date().toDateString();
    if (user.lastReset !== today) {
        user.usageToday = 0;
        user.lastReset = today;
    }
}

function checkAndIncrementUsage(apiKey) {
    const user = users[apiKey];
    if (!user) return { allowed: false, reason: 'Invalid API key.' };

    resetIfNewDay(user);

    const plan = PLANS[user.plan];
    const limit = plan.dailyLimit;

    if (user.usageToday >= limit) {
        return {
            allowed: false,
            reason: `Daily limit reached (${limit} generations/day on ${plan.name} plan). Upgrade to unlock more.`,
            usage: user.usageToday,
            limit,
            plan: plan.name,
        };
    }

    user.usageToday++;
    return {
        allowed: true,
        usage: user.usageToday,
        limit,
        plan: plan.name,
        remaining: limit === Infinity ? 'Unlimited' : limit - user.usageToday,
    };
}

function getUsageStats(apiKey) {
    const user = users[apiKey];
    if (!user) return null;
    resetIfNewDay(user);
    const plan = PLANS[user.plan];
    return {
        name: user.name,
        plan: plan.name,
        usage: user.usageToday,
        limit: plan.dailyLimit,
        remaining: plan.dailyLimit === Infinity ? 'Unlimited' : plan.dailyLimit - user.usageToday,
        price: plan.price,
    };
}

module.exports = { getUser, checkAndIncrementUsage, getUsageStats, PLANS };
