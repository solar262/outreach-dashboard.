/**
 * SaaS Config Bridge
 * Safely pulls credentials from existing outreach-dashboard config.
 * Falls back to env vars if config file is unavailable.
 */

let existingConfig = {};
try {
    existingConfig = require('../outreach-dashboard/facebook-bot-config');
} catch (e) {
    console.warn('[Config] outreach-dashboard config not found, falling back to env vars.');
}

const config = {
    GROQ_API_KEY: existingConfig.GROQ_API_KEY || process.env.GROQ_API_KEY || '',
    PORTAL_URL: existingConfig.PORTAL_URL || process.env.PORTAL_URL || 'https://outreachstudio.ai',
    PORT: process.env.PORT || 3500,
};

if (!config.GROQ_API_KEY) {
    console.warn('[Config] ⚠️  GROQ_API_KEY is not set. AI generation will use fallback templates.');
}

module.exports = config;
