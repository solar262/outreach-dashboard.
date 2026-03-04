const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getUsageStats } = require('../db/users');
const axios = require('axios');
const cfg = require('../config');

// ─── Groq LLM Helper ─────────────────────────────────────────────────────────

async function callGroq(systemPrompt, userPrompt) {
    if (!cfg.GROQ_API_KEY) {
        return null; // Fallback to templates
    }
    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.75,
        }, {
            headers: {
                Authorization: `Bearer ${cfg.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data.choices[0].message.content;
    } catch (err) {
        console.error('[AI Route] Groq error:', err.response?.data?.error?.message || err.message);
        return null;
    }
}

// ─── Usage Stats ─────────────────────────────────────────────────────────────

router.get('/usage', (req, res) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    if (!apiKey) return res.status(401).json({ error: 'Missing API key' });
    const stats = getUsageStats(apiKey);
    if (!stats) return res.status(401).json({ error: 'Invalid API key' });
    res.json(stats);
});

// ─── Strategy Generator ───────────────────────────────────────────────────────

router.post('/generate/strategy', auth, async (req, res) => {
    const { name, notes, platform } = req.body;
    if (!name || !notes) return res.status(400).json({ error: 'name and notes are required.' });

    const systemPrompt = `You are a world-class strategic growth orchestrator. 
Your goal is to build an Unfair Advantage for your client's outreach using autonomous AI infrastructure.
Your tone is executive, analytical, and slightly "insider" — you see patterns others miss.
Generate targeted outreach designed to pique genuine interest. Never be salesy.`;

    const userPrompt = `Lead Name: ${name}
Platform: ${platform || 'LinkedIn'}
Notes: ${notes}

Generate:
1. A concise outreach STRATEGY (1 sentence — what angle to take)
2. A high-value OPENING MESSAGE (2-3 sentences) that frames value around "Strategic Autonomy" and reduces friction.
3. A FOLLOW-UP line if they don't respond in 3 days (1 sentence).

Format your reply clearly with labels: STRATEGY:, MESSAGE:, FOLLOW-UP:`;

    const result = await callGroq(systemPrompt, userPrompt);

    let strategy, message, followUp;
    if (result) {
        const stratMatch = result.match(/STRATEGY:\s*(.+?)(?=MESSAGE:|$)/s);
        const msgMatch = result.match(/MESSAGE:\s*(.+?)(?=FOLLOW-UP:|$)/s);
        const fuMatch = result.match(/FOLLOW-UP:\s*(.+?)$/s);
        strategy = stratMatch?.[1]?.trim() || '';
        message = msgMatch?.[1]?.trim() || '';
        followUp = fuMatch?.[1]?.trim() || '';
    } else {
        // Fallback template
        strategy = 'Lead with systemic insight — position automation as a strategic unlock, not a tool.';
        message = `Greetings ${name.split(' ')[0]}, I've been analyzing the ${platform || 'space'} landscape. Most scaling attempts stall due to linear execution traps — I've architected a framework that removes that ceiling. Worth a 15-minute sync?`;
        followUp = `Still relevant, ${name.split(' ')[0]}? Happy to share a quick case study if timing is better now.`;
    }

    res.json({
        strategy,
        message,
        followUp,
        usage: res.locals.usage
    });
});

// ─── Closer Generator ─────────────────────────────────────────────────────────

router.post('/generate/closer', auth, async (req, res) => {
    const { threadHistory, leadName, leadNotes } = req.body;
    if (!threadHistory) return res.status(400).json({ error: 'threadHistory is required.' });

    const systemPrompt = `You are a high-ticket closer. Your job is to advance a sales conversation naturally — book a call or send a strategic resource. 
Be direct but not pushy. Mirror the lead's energy. Use scarcity sparingly.
Portal URL: ${cfg.PORTAL_URL}`;

    const userPrompt = `Lead: ${leadName || 'the prospect'}
Notes: ${leadNotes || 'scaling business'}

Recent conversation thread:
${threadHistory}

Generate the perfect NEXT REPLY to advance this deal. End with a soft CTA (book a call or visit the portal).`;

    const result = await callGroq(systemPrompt, userPrompt);

    const reply = result || `That's a great question. The system essentially decouples your personal time from revenue generation — your infrastructure runs while you focus on high-level decisions. I'd love to walk you through a live demo. Are you free for a 20-minute call this week? ${cfg.PORTAL_URL}`;

    res.json({ reply, usage: res.locals.usage });
});

// ─── Viral Comment Generator ──────────────────────────────────────────────────

router.post('/generate/viral', auth, async (req, res) => {
    const { postContent, personaName } = req.body;
    if (!postContent) return res.status(400).json({ error: 'postContent is required.' });

    const systemPrompt = `You are ${personaName || 'a strategic consultant'}, a world-class authority in business growth.
You are commenting on a high-traffic post to build visibility and authority.
Your comment must:
- Reframe the discussion with a "Systemic Insight"
- Use executive vocabulary (Operational Friction, Non-linear Scaling, Execution Risk)
- Be the "smartest voice in the room"
- 1-2 impactful sentences max
- Sound natural and human, never robotic`;

    const userPrompt = `POST CONTENT: ${postContent}

Generate an authority-building viral comment that will get likes and replies.`;

    const result = await callGroq(systemPrompt, userPrompt);
    const comment = result || `The real bottleneck here isn't effort — it's Operational Entropy. The moment you decouple execution from your personal bandwidth, the trajectory changes entirely.`;

    res.json({ comment, usage: res.locals.usage });
});

// ─── Peer Validation Reply ────────────────────────────────────────────────────

router.post('/generate/validate', auth, async (req, res) => {
    const { originalPost, peerComment, validatorPersona } = req.body;
    if (!originalPost || !peerComment) return res.status(400).json({ error: 'originalPost and peerComment are required.' });

    const systemPrompt = `You are ${validatorPersona || 'a senior operational consultant'}. A peer has left a strategic comment on a post.
VALIDATE and EXPAND upon their comment to create social proof.
Rules:
- Do NOT just say "I agree"
- Use phrases like "Spot on," "Exactly right — and building on that..."
- Add one new layer of analytical insight
- Sound executive and human`;

    const userPrompt = `ORIGINAL POST: ${originalPost}
PEER COMMENT: ${peerComment}

Generate a validation reply that boosts both of your authority.`;

    const result = await callGroq(systemPrompt, userPrompt);
    const reply = result || `Spot on — and building on that, the compounding effect is what most operators overlook. Once execution becomes infrastructure, the growth curve fundamentally changes shape.`;

    res.json({ reply, usage: res.locals.usage });
});

module.exports = router;
