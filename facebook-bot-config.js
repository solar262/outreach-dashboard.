/**
 * facebook-bot-config.js
 * Configuration for the stealth Facebook outreach bot.
 * Tune these values to control behavior and safety limits.
 */

module.exports = {
    // === API KEYS ===
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',

    // === SAFETY LIMITS ===
    // Max DMs/replies to send per run. Start LOW (3-5) and ramp up over weeks.
    DAILY_CAP: 50,

    // Minimum and maximum wait between engaging each lead (milliseconds)
    // Randomized within this range to avoid pattern detection
    MIN_DELAY_MS: 12000,   // 12 seconds
    MAX_DELAY_MS: 35000,   // 35 seconds

    // How long to wait after clicking the message button before typing (ms)
    COMPOSE_SETTLE_MS: 2500,

    // === BROWSER SETTINGS ===
    // Path to your Edge User Data directory
    EDGE_USER_DATA: `C:\\Users\\qwerty\\AppData\\Local\\Microsoft\\Edge\\User Data`,

    // Bureau Mode: Array of profiles to iterate through
    // Ensure you are logged into Facebook on each of these profiles in Edge.
    EDGE_PROFILES: ['Default', 'Profile 1'],

    // Max leads to engage in a single profile session (to keep it light and safe)
    PROFILE_CAP: 10,

    // Brief cooldown between switching identities (minutes)
    BUREAU_COOLDOWN_MINS: 15,

    // Path to the Edge executable
    EDGE_EXECUTABLE: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',

    // Always false — headless mode is detectable. Visible window is safer and monitors-able.
    HEADLESS: false,

    // Slow down all Playwright actions by this many ms (simulates human reaction time)
    SLOW_MO_MS: 80,

    // === LOGGING ===
    LOG_FILE: 'outreach_log.json',

    // === VIEWPORT ===
    // Match a common screen resolution — do NOT use default 1280x720 (bot tell)
    VIEWPORT: { width: 1366, height: 768 },

    // === PILLAR 2: VIRAL BAITING TARGETS ===
    // High-traffic authority hubs where we 'hijack' visibility
    VIRAL_TARGETS: [
        'https://www.facebook.com/groups/automationandconversion/', // Example Group
        'https://www.facebook.com/groups/SaaSGrowthHacking/',        // SaaS & Scaling
        'https://www.facebook.com/groups/B2BSalesStrategy/',       // Professional Services
    ],

    // === MONETIZATION ===
    // The link shared with leads to book a call or finalize a lease
    PORTAL_URL: 'https://sad-boxes-talk.loca.lt/access',
};
