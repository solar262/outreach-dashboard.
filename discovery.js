const axios = require('axios');
const fs = require('fs');

const API_KEY = 'c13160b6ad6ff52c9cdd5e7301a901a293fbff5d';
const LEADS_SERVER_URL = 'http://localhost:3001/api/leads';

const QUERIES = [
    // High-intent help requests
    'site:facebook.com/groups "how do I" "automation" OR "workflow" advice',
    'site:facebook.com/groups "recommend" "automation" OR "bot" for business',
    'site:facebook.com/groups "looking for" "developer" "automate" routine tasks',
    'site:facebook.com/groups "help with" "sales pipeline" OR "customer acquisition"',
    'site:facebook.com/groups "automate" "operations" help',
    // Targeted platforms
    'site:linkedin.com/posts "leveraging AI" "automation" "workflow" help',
    'site:reddit.com/r/smallbusiness "automate" OR "automation" advice',
];

const BLOCKLIST = [
    'Davos', 'World Economic Forum', 'WEF', 'Election', '2026 Empire', 'Infrastructure advances', 'China', 'Global economy'
];

async function searchSerper(query) {
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: query,
            num: 10
        }, {
            headers: {
                'X-API-KEY': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        return response.data.organic || [];
    } catch (error) {
        console.error(`Error searching for "${query}":`, error.message);
        return [];
    }
}

async function discoverLeads() {
    console.log("\n[Discovery] 🔍 Starting LIVE Link Mining with Serper Dev...");

    let allFound = [];

    for (const query of QUERIES) {
        console.log(`[Discovery] 📡 Searching: ${query}...`);
        const results = await searchSerper(query);

        results.forEach(res => {
            const content = (res.title + ' ' + res.snippet).toLowerCase();
            const isBlocked = BLOCKLIST.some(block => content.includes(block.toLowerCase()));

            if (!isBlocked) {
                allFound.push({
                    name: res.title.substring(0, 50),
                    platform: res.link.includes('facebook') ? 'Facebook' : (res.link.includes('linkedin') ? 'LinkedIn' : 'Fiverr'),
                    url: res.link,
                    notes: res.snippet
                });
            } else {
                console.log(`[Discovery] 🚫 Blocked irrelevant result: ${res.title}`);
            }
        });
    }

    console.log(`[Discovery] ✅ Found ${allFound.length} live potential leads.`);

    let importedCount = 0;
    for (const lead of allFound) {
        try {
            await axios.post(LEADS_SERVER_URL, lead);
            importedCount++;
        } catch (err) {
            // Silently ignore duplicates or server errors
        }
    }

    console.log(`[Discovery] ✨ Sync complete: ${importedCount} leads imported to dashboard.`);
    return allFound;
}

// Module exporting for Pulse mode
if (require.main === module) {
    discoverLeads().catch(console.error);
} else {
    module.exports = { discoverLeads };
}
