/**
 * facebook-bot.js
 * Hands-free, stealth Facebook outreach bot.
 * 
 * Uses your REAL Edge browser + existing session — Facebook sees your normal browser.
 * Applies humanistic mouse, typing, and jitter from the existing engine.
 * 
 * Usage:
 *   node facebook-bot.js           → Live mode (actually sends messages)
 *   node facebook-bot.js --dry-run → Navigates but does NOT send
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Added for webLog
const cfg = require('./facebook-bot-config');
const { Typing, Jitter } = require('./humanistic-engine/index');
const Reasoning = require('./humanistic-engine/reasoning'); // Changed to direct import
const { discoverLeads } = require('./discovery');

// ─── Telemetry Engine ────────────────────────────────────────────────────────

const LEADS_SERVER_URL = 'http://localhost:3001/api/leads';
const TELEMETRY_URL = 'http://localhost:3001/api/logs';

async function webLog(msg, type = 'info', persona = 'System') {
    const logObj = { timestamp: new Date().toISOString(), message: msg, type, persona };
    console.log(`[${persona}] ${msg}`); // Keep console.log for immediate feedback
    try {
        await axios.post(TELEMETRY_URL, logObj);
    } catch (_) {
        // Fail silently if server is down
    }
}

const LEADS_FILE = path.join(__dirname, 'leads.json');
const LOG_FILE = path.join(__dirname, cfg.LOG_FILE);
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLeads() {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
}

function saveLeads(leads) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

function logEngagement(entry) {
    let log = [];
    if (fs.existsSync(LOG_FILE)) {
        log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
    log.push({ ...entry, timestamp: new Date().toISOString() });
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// NEW: Store links for Pillar 2 Peer Validation
const OUTREACH_LINKS_FILE = path.join(__dirname, 'outreach_links.json');
function logOutreachLink(leadId, url, persona) {
    let links = [];
    if (fs.existsSync(OUTREACH_LINKS_FILE)) {
        links = JSON.parse(fs.readFileSync(OUTREACH_LINKS_FILE, 'utf8'));
    }
    links.push({ leadId, url, persona, timestamp: new Date().toISOString(), validatedBy: [] });
    // Keep only last 100 links
    if (links.length > 100) links.shift();
    fs.writeFileSync(OUTREACH_LINKS_FILE, JSON.stringify(links, null, 2));
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Humanistic random scroll to simulate reading the page
async function humanScroll(page) {
    const scrolls = randomDelay(2, 5);
    for (let i = 0; i < scrolls; i++) {
        const amount = randomDelay(120, 400);
        await page.mouse.wheel(0, amount);
        await page.waitForTimeout(randomDelay(600, 1800));
    }
}

// Move mouse to element with human-like curve before clicking
async function humanClick(page, element) {
    const box = await element.boundingBox();
    if (!box) throw new Error('Element has no bounding box');

    // Aim for the center with slight randomness (not pixel-perfect)
    const targetX = box.x + box.width / 2 + randomDelay(-5, 5);
    const targetY = box.y + box.height / 2 + randomDelay(-3, 3);

    // Get current mouse position (start from somewhere natural)
    await page.mouse.move(targetX - randomDelay(80, 200), targetY - randomDelay(30, 80), { steps: randomDelay(8, 15) });
    await page.waitForTimeout(randomDelay(200, 500));
    await page.mouse.move(targetX, targetY, { steps: randomDelay(5, 10) });
    await page.waitForTimeout(randomDelay(100, 300));
    await page.mouse.click(targetX, targetY);
}

// Type message character by character with jitter — no clipboard paste
async function humanType(page, selector, message) {
    const words = message.split(' ');
    process.stdout.write(`[Bot]   - typing message... `);
    for (let w = 0; w < words.length; w++) {
        const word = words[w];
        if (w % 5 === 0 && w > 0) process.stdout.write(`(${w}/${words.length}) `);

        for (const char of word) {
            try {
                await page.keyboard.type(char);
                await page.waitForTimeout(randomDelay(35, 130));
            } catch (err) {
                webLog(`⚠️ Typing interrupted: ${err.message}`, 'error', 'Bot');
                return; // Stop typing if page is lost
            }
        }
        if (w < words.length - 1) {
            await page.keyboard.type(' ');
            await page.waitForTimeout(randomDelay(50, 180));
        }
        if (w > 0 && w % randomDelay(6, 15) === 0) {
            await page.waitForTimeout(randomDelay(300, 1000));
        }
    }
    webLog('DONE ✅', 'info', 'Bot');
}

// ─── Cookie consent dismissal ───────────────────────────────────────────────
// Facebook cookie consent popup blocks everything if not logged in.
// This auto-dismisses it so the real page loads.

async function dismissCookieConsent(page) {
    const cookieBtns = [
        'button[data-cookiebanner="accept_button"]',
        'button[title="Allow all cookies"]',
        'button[title="Accept all"]',
        'div[aria-label="Allow all cookies"] div[role="button"]',
        '[data-testid="cookie-policy-manage-dialog-accept-button"]',
        'button:has-text("Allow all cookies")',
        'button:has-text("Accept all")',
        'button:has-text("Only allow essential cookies")', // fallback: minimum consent
    ];
    for (const sel of cookieBtns) {
        try {
            const btn = await page.$(sel);
            if (btn) {
                await btn.click();
                webLog('🍪 Dismissed cookie consent.', 'info', 'Bot');
                await page.waitForTimeout(randomDelay(1000, 2000));
                return true;
            }
        } catch (_) { }
    }
    return false; // No cookie popup found (already logged in, or not shown)
}

// ─── Login check ─────────────────────────────────────────────────────────────
async function checkLoggedIn(page) {
    // Navigate to Facebook home — if we see the feed, we're logged in
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await dismissCookieConsent(page);
    await page.waitForTimeout(1500);
    const url = page.url();
    const isLoggedIn = !url.includes('/login') && !url.includes('login.php');
    return isLoggedIn;
}

// ─── Facebook-specific selectors ─────────────────────────────────────────────
// These are the selectors for Facebook's message box and send button.
// Facebook changes these periodically — update here if things break.

const FB_SELECTORS = {
    // DM message box on Messenger / profile page
    messageInput: [
        'div[aria-label="Message"]',
        'div[role="textbox"]',
        'div[contenteditable="true"]',
        'textarea[placeholder*="message"]',
    ],
    // Send button
    sendButton: [
        'div[aria-label="Send"]',
        'button[aria-label="Send"]',
        '[data-testid="mw_message_send_button"]',
    ],
    // "Message" CTA button on a Facebook profile
    messageProfileBtn: [
        'div[aria-label="Message"]',
        'a[aria-label="Send a message"]',
        'span[data-hover="tooltip"][data-tooltip-content="Message"]',
    ],
    // Reply box on a group post
    postReplyBox: [
        'div[aria-label="Write a comment…"]',
        'div[aria-label="Leave a comment..."]',
        'div[aria-label*="comment"]',
    ],
    // Reply/comment send button
    postSendBtn: [
        'div[aria-label="Comment"]',
        '[data-testid="comment-post-button"]',
    ],
    // Deep Engagement: Liking
    likeButton: [
        'div[aria-label="Like"]',
        'div[data-testid="UFI2ReactionLink/action_link"]',
    ],
    commentText: 'div[role="article"] div[dir="auto"]',
    // Inbox / Messenger Specific
    inboxNav: 'a[href*="/messages/t/"]',
    threadList: 'div[role="grid"] div[role="row"]',
    unreadBadge: 'span[aria-label*="unread"]',
    messageHistory: 'div[role="main"] div[data-testid="message_container"]',
};

async function findElement(page, selectorList, timeout = 4000) {
    const list = Array.isArray(selectorList) ? selectorList : [selectorList];
    for (const sel of list) {
        try {
            process.stdout.write(`[Bot]   - checking: ${sel} ... `); // Keep stdout.write for progress
            const el = await page.waitForSelector(sel, { timeout, state: 'visible' });
            if (el) {
                webLog('FOUND ✅', 'info', 'Bot');
                return el;
            }
        } catch (_) {
            webLog('no', 'info', 'Bot');
        }
    }
    return null;
}

// ─── The Closer Logic ────────────────────────────────────────────────────────

async function monitorInbox(page, personaName) {
    webLog('📨 Inbox: Checking for lead replies...', 'stage', personaName);
    await page.goto('https://www.facebook.com/messages/t/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(randomDelay(3000, 5000));

    // Look for threads. This is a simplified selector-based approach.
    // In a production bot, we would cross-reference lead names.
    const threads = await page.$$(FB_SELECTORS.threadList);
    webLog(`Found ${threads.length} active threads.`, 'info', personaName);

    for (let i = 0; i < Math.min(threads.length, 5); i++) {
        const thread = threads[i];

        // Check for unread marker or just process the top ones for activity
        const hasUnread = await thread.$(FB_SELECTORS.unreadBadge);

        if (hasUnread) {
            webLog(`Thread ${i + 1} has unread messages. Analyzing...`, 'info', personaName);
            await humanClick(page, thread);
            await page.waitForTimeout(randomDelay(2000, 4000));

            // Extract history (last 5-8 messages)
            const messages = await page.$$eval(FB_SELECTORS.messageHistory, els =>
                els.slice(-8).map(el => el.innerText).join('\n')
            );

            webLog('Analyzing conversation history with Groq...', 'info', personaName);
            const analysis = await Reasoning.analyzeThread(messages);
            webLog(`Strategic Analysis: ${analysis.substring(0, 80)}...`, 'info', personaName);

            if (analysis.toLowerCase().includes('interested') || analysis.toLowerCase().includes('inquiry')) {
                const response = await Reasoning.generateCloserResponse(messages, "High-ticket strategic architecture lead.");
                webLog(`Synthesized Closer Response: "${response.substring(0, 60)}..."`, 'info', personaName);

                const inputEl = await findElement(page, FB_SELECTORS.messageInput);
                if (inputEl) {
                    await humanClick(page, inputEl);
                    await humanType(page, null, response);
                    await page.waitForTimeout(randomDelay(1000, 2000));

                    if (!DRY_RUN) {
                        const sendBtn = await findElement(page, FB_SELECTORS.sendButton);
                        if (sendBtn) await humanClick(page, sendBtn);
                        webLog('✅ Closer response sent.', 'success', personaName);
                    } else {
                        webLog('🔵 DRY RUN — Closer response not sent.', 'dry-run', personaName);
                    }
                }
            } else {
                webLog('No immediate closing opportunity detected in this thread.', 'info', personaName);
            }

            await page.waitForTimeout(randomDelay(2000, 4000));
        }
    }
}

// ─── Core engagement logic ───────────────────────────────────────────────────

// ─── Deep Engagement Optimization ──────────────────────────────────────────

async function likePost(page, personaName) {
    try {
        webLog('❤️ Liking: Applying social proof to post...', 'stage', personaName);
        const likeBtn = await findElement(page, FB_SELECTORS.likeButton, 3000);
        if (likeBtn) {
            await humanClick(page, likeBtn);
            webLog('✅ Post liked.', 'success', personaName);
            await page.waitForTimeout(randomDelay(1000, 2500));
        } else {
            webLog('⚠️ Like button not found or already active.', 'warn', personaName);
        }
    } catch (err) {
        webLog(`⚠️ Failed to like post: ${err.message}`, 'error', personaName);
    }
}

async function engageLead(page, lead, personaName) {
    const url = lead.url;
    webLog(`🌐 Navigation: Navigating to ${url}...`, 'stage', personaName);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    webLog('⏳ Settling: Letting page load...', 'stage', personaName);
    await page.waitForTimeout(randomDelay(2000, 4000));

    // 1. Check if page is available / blocked
    const unavailable = await page.$('text="This content isn\'t available at the moment"');
    if (unavailable) throw new Error('FACEBOOK_CONTENT_UNAVAILABLE');

    await dismissCookieConsent(page);
    await page.waitForTimeout(randomDelay(800, 1500));

    // 2. Reading & Liking
    webLog('📖 Reading: Scrolling and analyzing thread...', 'stage', personaName);
    await humanScroll(page);
    await page.waitForTimeout(randomDelay(1000, 2500));

    // Likestorming (Social Proof)
    await likePost(page, personaName);

    // 3. Extract Context (Deep Reading)
    const threadContext = await page.$$eval(FB_SELECTORS.commentText, (els) => {
        // Look for the actual post title/content first
        const postContent = document.querySelector('div[data-ad-preview="message"]')?.innerText || "";
        const comments = els.slice(0, 10).map(el => el.innerText).join('\n');
        return `POST CONTENT:\n${postContent}\n\nEXISTING COMMENTS:\n${comments}`;
    });
    if (threadContext) webLog(`🧠 Thread Intelligence: Extracted post and ${threadContext.split('\n').length} comment segments.`, 'info', personaName);

    // 4. Searching for input
    webLog('🔍 Searching: Looking for engagement point...', 'stage', personaName);
    let inputEl = await findElement(page, FB_SELECTORS.postReplyBox);
    let mode = 'comment';

    if (!inputEl) {
        webLog('🔍 Searching: No reply box. Trying Message CTA...', 'stage', personaName);
        const msgBtn = await findElement(page, FB_SELECTORS.messageProfileBtn);
        if (msgBtn) {
            await humanClick(page, msgBtn);
            await page.waitForTimeout(randomDelay(3000, 5000));
            inputEl = await findElement(page, FB_SELECTORS.messageInput);
            mode = 'dm';
        }
    }

    if (!inputEl) throw new Error('NO_INPUT_FOUND');

    return { inputEl, mode, threadContext };
}

async function performEngage(page, inputEl, mode, message, personaName) {
    webLog(`⌨️ Typing: Engaging via ${mode}...`, 'stage', personaName);
    await humanClick(page, inputEl);
    await inputEl.focus();
    await page.waitForTimeout(randomDelay(800, 1500));

    if (DRY_RUN) {
        webLog(`🔵 DRY RUN — Message: "${message.substring(0, 80)}..."`, 'dry-run', personaName);
        return;
    }

    await humanType(page, null, message);
    await page.waitForTimeout(randomDelay(2000, 4000));

    if (mode === 'comment') {
        const sendEl = await findElement(page, FB_SELECTORS.postSendBtn);
        if (sendEl) await humanClick(page, sendEl);
        else await page.keyboard.press('Enter');
    } else {
        const sendEl = await findElement(page, FB_SELECTORS.sendButton);
        if (sendEl) await humanClick(page, sendEl);
        else await page.keyboard.press('Enter');
    }
    webLog('✅ Engagement sent.', 'success', personaName);
}

// NEW: Pillar 2 - Navigate to a peer's comment and provide social proof
async function validatePeerOutreach(page, personaName) {
    if (!fs.existsSync(OUTREACH_LINKS_FILE)) return;
    const links = JSON.parse(fs.readFileSync(OUTREACH_LINKS_FILE, 'utf8'));

    // Find unvalidated links from OTHER personas (max 2 per run to stay stealthy)
    const targets = links.filter(l => l.persona !== personaName && !l.validatedBy.includes(personaName)).slice(-2);

    if (targets.length === 0) return;

    webLog(`🤝 Peer Validation: Found ${targets.length} outreach posts to support.`, 'info', personaName);

    for (const target of targets) {
        try {
            webLog(`🔍 Validating Peer: ${target.url}`, 'stage', personaName);
            await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(randomDelay(2000, 4000));
            await humanScroll(page);

            // 1. Like the original post (if not already done)
            await likePost(page, personaName);

            // 2. Find the peer's comment (this is tricky on FB, usually looks for the persona name)
            const peerCommentEl = await page.$(`text="${target.persona}"`);
            if (peerCommentEl) {
                webLog(`👍 Found peer's comment. Applying social proof...`, 'info', personaName);

                // Click "Like" on the comment if possible
                const likeBtn = await peerCommentEl.evaluateHandle(el => {
                    const parent = el.closest('div[role="article"]') || el.parentElement;
                    return parent.querySelector('div[role="button"][aria-label*="Like"]');
                });
                if (likeBtn && likeBtn.asElement()) await humanClick(page, likeBtn.asElement());

                // 3. Generate and post a validation reply
                const originalPostText = await page.$eval('div[data-ad-preview="message"]', el => el.innerText).catch(() => "Post engagement");
                const peerCommentText = await peerCommentEl.evaluate(el => el.innerText).catch(() => "Strategic advice");

                const validationMsg = await Reasoning.generateValidationReply(originalPostText, peerCommentText, personaName);

                // Find reply box for THAT specific comment
                const replyBtn = await peerCommentEl.evaluateHandle(el => {
                    const parent = el.closest('div[role="article"]') || el.parentElement;
                    return parent.querySelector('div[role="button"][aria-label*="Reply"]');
                });

                if (replyBtn && replyBtn.asElement()) {
                    await humanClick(page, replyBtn.asElement());
                    await page.waitForTimeout(randomDelay(1000, 2000));
                    const replyInput = await findElement(page, FB_SELECTORS.messageInput); // Usually uses same box
                    if (replyInput) {
                        await performEngage(page, replyInput, 'comment', validationMsg, personaName);
                        webLog(`✅ Peer validation complete.`, 'success', personaName);
                    }
                }
            }

            // Mark as validated
            target.validatedBy.push(personaName);
            fs.writeFileSync(OUTREACH_LINKS_FILE, JSON.stringify(links, null, 2));

        } catch (err) {
            webLog(`⚠️ Validation failed: ${err.message}`, 'warn', personaName);
        }
        await page.waitForTimeout(randomDelay(cfg.MIN_DELAY_MS, cfg.MAX_DELAY_MS));
    }
}

// NEW: Pillar 2 - Navigate to high-traffic hubs and drop "authority bait" comments
async function performViralBaiting(page, personaName) {
    if (!cfg.VIRAL_TARGETS || cfg.VIRAL_TARGETS.length === 0) return;

    // Pick 1 random target per session to avoid over-activity
    const targetUrl = cfg.VIRAL_TARGETS[Math.floor(Math.random() * cfg.VIRAL_TARGETS.length)];

    webLog(`🎣 Viral Baiting: Navigating to authority hub: ${targetUrl}`, 'info', personaName);

    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(randomDelay(3000, 6000));
        await humanScroll(page);

        // Find a recent post with some engagement but not too old
        const posts = await page.$$('div[role="feed"] > div, div[data-testid="post_container"]');
        if (posts.length === 0) return;

        // Take the first or second post
        const post = posts[Math.min(1, posts.length - 1)];
        await post.scrollIntoViewIfNeeded();

        const postText = await post.evaluate(el => el.innerText).catch(() => "Industry discussion");

        webLog(`💡 Viral Baiting: Analyzing post for intellectual hijacking...`, 'stage', personaName);
        const viralComment = await Reasoning.generateViralComment(postText, personaName);

        // Find comment box for this specific post
        const commentBox = await post.evaluateHandle(el => el.querySelector('div[role="textbox"], div[aria-label="Write a comment"]'));

        if (commentBox && commentBox.asElement()) {
            await humanClick(page, commentBox.asElement());
            await page.waitForTimeout(randomDelay(1000, 2000));
            const activeInput = await page.evaluateHandle(() => document.activeElement);
            if (activeInput && activeInput.asElement()) {
                await performEngage(page, activeInput.asElement(), 'comment', viralComment, personaName);
                webLog(`🔥 Viral Baiting: Strategic insight deployed. Over and out.`, 'success', personaName);
            }
        }

    } catch (err) {
        webLog(`⚠️ Viral Baiting failed: ${err.message}`, 'warn', personaName);
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

// ─── Main Logic ──────────────────────────────────────────────────────────────

async function stealthSleep(hours, personaName) {
    const ms = hours * 60 * 60 * 1000;
    const end = Date.now() + ms;
    webLog(`💤 Pulse Cooldown: Sleeping for ~${hours.toFixed(1)} hours...`, 'info', personaName);

    while (Date.now() < end) {
        // Every 30-60 mins, do a micro-activity to keep session alive but "idle"
        const nextActivity = randomDelay(30 * 60000, 60 * 60000);
        await new Promise(r => setTimeout(r, Math.min(nextActivity, end - Date.now())));

        if (Date.now() < end) {
            webLog(`💓 Pulse Heartbeat: Simulating micro-activity to maintain stealth...`, 'info', personaName);
            // We'd need a page here if we wanted to scroll, but staying idle is fine too.
        }
    }
}

async function run(browserContext, personaName) {
    const page = await browserContext.newPage();
    try {
        // Load & filter leads — refresh list every run
        const allLeads = getLeads();

        // 1. Discovery Sync: If target pool is low, find more leads
        const newTargets = allLeads.filter(l => l.status === 'New' && l.platform === 'Facebook');
        if (newTargets.length < 5) {
            webLog(`🔍 Low Lead Alert: Triggering autonomous discovery...`, 'warn', personaName);
            await discoverLeads();
        }

        const freshLeads = getLeads().filter(l => l.status === 'New' && l.platform === 'Facebook');
        const targets = freshLeads.slice(0, cfg.PROFILE_CAP);

        if (targets.length === 0) {
            webLog(`No leads available. Cycle complete.`, 'info', personaName);
            return 0;
        }

        webLog(`Found ${targets.length} Facebook targets for this pulse.`, 'info', personaName);

        // Verify login
        const loggedIn = await checkLoggedIn(page);
        if (!loggedIn) throw new Error('Not logged into Facebook');

        // Phase 0: Peer Validation (Pillar 2 Social Proof)
        await validatePeerOutreach(page, personaName);

        // Phase 1: The Closer (Inbox Monitor)
        await monitorInbox(page, personaName);

        // Phase 2: The Outreach
        let engagedCount = 0;
        for (const lead of targets) {
            try {
                await webLog(`🎯 Pulse Target: ${lead.name}`, 'target', personaName);

                // 1. Contextual Entry (Navigate, Like, Read comments)
                const { inputEl, mode, threadContext } = await engageLead(page, lead, personaName);

                // 2. Sophisticated Reasoning (Groq AI)
                const analysis = await Reasoning.analyzeProfile(lead, threadContext);
                const { message, strategy } = await Reasoning.generateStrategy(lead, analysis);

                // 3. Execution (Humanistic Typing)
                await webLog(`🧠 Synthesized strategy: ${strategy}`, 'reasoning', personaName);
                await performEngage(page, inputEl, mode, message, personaName);
                await webLog(`✅ Message sent to: ${lead.name}`, 'success', personaName);

                if (!DRY_RUN) {
                    const updatedLeads = getLeads();
                    const idx = updatedLeads.findIndex(l => l.id === lead.id);
                    if (idx !== -1) {
                        updatedLeads[idx].status = 'Outreached';
                        updatedLeads[idx].lastMessage = message;
                        saveLeads(updatedLeads);
                    }
                    logEngagement({ leadId: lead.id, name: lead.name, platform: lead.platform, message, strategy });
                    logOutreachLink(lead.id, lead.url, personaName);
                    engagedCount++;
                }

                if (engagedCount > 0 && engagedCount % 3 === 0) {
                    console.log('\n[Bot] 🔄 Periodic Inbox Sync...');
                    await monitorInbox(page);
                }

            } catch (err) {
                console.error(`[Bot] ⚠️  Target Failed: "${lead.name}" -> ${err.message}`);

                // Mark as failed so we don't retry forever
                if (!DRY_RUN) {
                    const updatedLeads = getLeads();
                    const idx = updatedLeads.findIndex(l => l.id === lead.id);
                    if (idx !== -1) {
                        updatedLeads[idx].status = 'Failed';
                        updatedLeads[idx].notes = `Engagement Error: ${err.message}`;
                        saveLeads(updatedLeads);
                    }
                    logEngagement({ leadId: lead.id, name: lead.name, error: err.message, status: 'failed' });
                }
            }

            const wait = randomDelay(cfg.MIN_DELAY_MS, cfg.MAX_DELAY_MS);
            console.log(`\n[Bot] 💤 Humanistic Pause: ${(wait / 1000).toFixed(0)}s...`);
            await page.waitForTimeout(wait);
        }

        // Phase 3: Viral Baiting (Authority Building)
        await performViralBaiting(page, personaName);

        return engagedCount;

    } finally {
        await page.close();
    }
}

async function mainPulse() {
    console.log(`\n${'█'.repeat(55)}`);
    console.log(`  🤖 100% AUTONOMOUS BUREAU MODE ACTIVATED`);
    console.log(`  Loop       : Persistent (Multi-Identity)`);
    console.log(`  Bureau     : ${cfg.EDGE_PROFILES.join(', ')}`);
    console.log(`  Safety     : Hyper-Human Stealth Enabled`);
    console.log(`${'█'.repeat(55)}\n`);

    const profilePath = cfg.EDGE_USER_DATA;

    while (true) {
        await webLog(`🏛️ Starting Global Pulse Cycle: ${new Date().toLocaleString()}`, 'stage', 'Bureau');

        for (const profileName of cfg.EDGE_PROFILES) {
            await webLog(`👤 Activating Persona: ${profileName}`, 'stage', 'Bureau');

            try {
                // Kill Edge to unlock profile
                require('child_process').execSync('taskkill /F /IM msedge.exe /T', { stdio: 'ignore' });
                await new Promise(r => setTimeout(r, 4000));
            } catch (_) { }

            const browser = await chromium.launchPersistentContext(profilePath, {
                executablePath: cfg.EDGE_EXECUTABLE,
                headless: cfg.HEADLESS,
                slowMo: cfg.SLOW_MO_MS,
                viewport: cfg.VIEWPORT,
                args: [
                    `--profile-directory=${profileName}`,
                    '--disable-blink-features=AutomationControlled',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--disable-notifications',
                ],
                ignoreDefaultArgs: ['--enable-automation'],
            });

            try {
                // Perform a session burst
                const count = await run(browser, profileName);
                console.log(`[Bureau] ✅ Persona ${profileName} Session Complete. Engaged: ${count}`);
            } catch (err) {
                console.error(`[Bureau] ⚠️ Persona ${profileName} Error:`, err.message);
            } finally {
                await browser.close();
            }

            if (cfg.EDGE_PROFILES.indexOf(profileName) < cfg.EDGE_PROFILES.length - 1) {
                await webLog(`💤 Swapping identity in ${cfg.BUREAU_COOLDOWN_MINS} mins...`, 'info', 'Bureau');
                await new Promise(r => setTimeout(r, cfg.BUREAU_COOLDOWN_MINS * 60000));
            }
        }

        // Long cooldown between global cycles (2.5 to 4.5 hours)
        const sleepHours = 2.5 + Math.random() * 2;
        await stealthSleep(sleepHours, 'Bureau');
    }
}

mainPulse().catch(err => {
    console.error('[Bot] 💀 Fatal Pulse Failure:', err.message);
    process.exit(1);
});
