const { getUser, checkAndIncrementUsage, PLANS } = require('../db/users');
const { getProvisionedUser } = require('../provisioner');

/**
 * Validates API key and enforces daily usage limits per plan tier.
 * Checks both hardcoded demo keys and dynamically provisioned keys (from Gumroad/Stripe).
 */
function authMiddleware(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.body?.apiKey;

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing API key. Include x-api-key header.' });
    }

    // Check provisioned keys first (real paying customers)
    const provisioned = getProvisionedUser(apiKey);
    if (provisioned) {
        // Enforce daily limits for provisioned keys
        const planData = PLANS[provisioned.plan] || PLANS.free;
        const today = new Date().toDateString();
        if (provisioned.lastReset !== today) {
            provisioned.usageToday = 0;
            provisioned.lastReset = today;
        }
        const limit = planData.dailyLimit;
        if (provisioned.usageToday >= limit) {
            return res.status(429).json({
                error: `Daily limit reached (${limit} generations/day on ${provisioned.plan} plan). Upgrade to unlock more.`,
                plan: provisioned.plan,
            });
        }
        provisioned.usageToday++;
        res.locals.apiKey = apiKey;
        res.locals.usage = {
            allowed: true,
            usage: provisioned.usageToday,
            limit,
            plan: planData.name,
            remaining: limit === Infinity ? 'Unlimited' : limit - provisioned.usageToday,
        };
        return next();
    }

    // Fall through to demo keys
    const user = getUser(apiKey);
    if (!user) {
        return res.status(401).json({ error: 'Invalid API key. Check your key in the dashboard.' });
    }

    const usageCheck = checkAndIncrementUsage(apiKey);
    if (!usageCheck.allowed) {
        return res.status(429).json({
            error: usageCheck.reason,
            plan: usageCheck.plan,
            usage: usageCheck.usage,
            limit: usageCheck.limit,
            upgradeUrl: 'https://outreachstudio.ai/pricing',
        });
    }

    res.locals.apiKey = apiKey;
    res.locals.usage = usageCheck;
    next();
}

module.exports = authMiddleware;
