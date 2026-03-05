const express = require('express');
const router = express.Router();
const cors = require('cors');

// Simple focused scraper for returning leads on demand
// (Mimics a simplified version of outreach_agent.mjs logic)
async function fetchRedditLeads(keyword) {
    console.log(`[Lead Search] Fetching recent posts for keyword: ${keyword}`);
    try {
        const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&t=week&limit=15`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Reddit API responded with status: ${response.status}`);
        }

        const data = await response.json();
        const posts = data.data?.children || [];

        const leads = posts.map(post => {
            const d = post.data;
            return {
                id: d.id,
                platform: 'Reddit',
                author: d.author,
                title: d.title,
                content: d.selftext || '',
                url: `https://reddit.com${d.permalink}`,
                created_utc: d.created_utc,
                subreddit: d.subreddit
            };
        });

        return leads;
    } catch (error) {
        console.error("[Lead Search] Error fetching leads:", error);
        return [];
    }
}

// Endpoint: GET /api/search-leads
router.get('/', cors(), async (req, res) => {
    try {
        const { keyword } = req.query;

        if (!keyword) {
            return res.status(400).json({ error: "Keyword parameter is required" });
        }

        const leads = await fetchRedditLeads(keyword);

        // Return valid data even if empty to avoid breaking UI 
        res.json({
            success: true,
            count: leads.length,
            leads: leads
        });

    } catch (error) {
        console.error("Lead search failed:", error);
        res.status(500).json({
            success: false,
            error: "Failed to scrape leads"
        });
    }
});

module.exports = router;
