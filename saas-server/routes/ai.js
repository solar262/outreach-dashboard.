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

// ─── Email Architect Generator ────────────────────────────────────────────────

router.post('/generate/email', auth, async (req, res) => {
    const { companyName, valueProp, context } = req.body;
    if (!companyName || !valueProp || !context) return res.status(400).json({ error: 'All fields are required.' });

    const systemPrompt = `You are a world-class B2B copywriter. Create a 4-day cold email sequence.
The emails must be short, punchy, and instantly show value. No fluff.
Focus on: ${valueProp}`;

    const userPrompt = `Prospect Company: ${companyName}
Context: ${context}

Generate:
1. Day 1 (Cold Outreach)
2. Day 2 (Quick Bump/Value Add)
3. Day 3 (Case Study/Proof)
4. Day 4 (Breakup/Soft Close)

Format your reply clearly with labels: DAY1:, DAY2:, DAY3:, DAY4:`;

    const result = await callGroq(systemPrompt, userPrompt);

    let day1, day2, day3, day4;
    if (result) {
        const d1Match = result.match(/DAY1:\s*(.+?)(?=DAY2:|$)/s);
        const d2Match = result.match(/DAY2:\s*(.+?)(?=DAY3:|$)/s);
        const d3Match = result.match(/DAY3:\s*(.+?)(?=DAY4:|$)/s);
        const d4Match = result.match(/DAY4:\s*(.+?)$/s);
        day1 = d1Match?.[1]?.trim() || '';
        day2 = d2Match?.[1]?.trim() || '';
        day3 = d3Match?.[1]?.trim() || '';
        day4 = d4Match?.[1]?.trim() || '';
    } else {
        day1 = `Hi name, noticed you are scaling. We help with ${valueProp}. Open to a quick chat?`;
        day2 = `Any thoughts on my previous note?`;
        day3 = `We just helped a similar company achieve massive results.`;
        day4 = `Assuming this isn't a priority right now. Let me know when things change.`;
    }

    res.json({ day1, day2, day3, day4, usage: res.locals.usage });
});

// ─── Objection Matrix Generator ───────────────────────────────────────────────

router.post('/generate/objection', auth, async (req, res) => {
    const { objection, context } = req.body;
    if (!objection) return res.status(400).json({ error: 'objection is required.' });

    const systemPrompt = `You are a master tactical sales closer. A rep has just received a difficult objection.
Provide 3 completely different psychological reframes to handle this objection and keep the deal alive.
Be direct, conversational, and authoritative.`;

    const userPrompt = `Objection: ${objection}
Context: ${context || 'General Sales Call'}

Generate 3 reframes:
1. The Logical Reframe
2. The Emotional Reframe
3. The "Takeaway" Reframe

Format your reply clearly with labels: REFRAME1:, REFRAME2:, REFRAME3:`;

    const result = await callGroq(systemPrompt, userPrompt);

    let reframe1, reframe2, reframe3;
    if (result) {
        const r1Match = result.match(/REFRAME1:\s*(.+?)(?=REFRAME2:|$)/s);
        const r2Match = result.match(/REFRAME2:\s*(.+?)(?=REFRAME3:|$)/s);
        const r3Match = result.match(/REFRAME3:\s*(.+?)$/s);
        reframe1 = r1Match?.[1]?.trim() || '';
        reframe2 = r2Match?.[1]?.trim() || '';
        reframe3 = r3Match?.[1]?.trim() || '';
    } else {
        reframe1 = `If we can prove the ROI, does that change things?`;
        reframe2 = `I understand. How is the current situation impacting your day-to-day?`;
        reframe3 = `It sounds like this might not be the right fit for you right now, and that's okay.`;
    }

    res.json({ reframe1, reframe2, reframe3, usage: res.locals.usage });
});

// ─── Profile Analyzer Generator ───────────────────────────────────────────────

router.post('/generate/linkedin', auth, async (req, res) => {
    const { bio } = req.body;
    if (!bio) return res.status(400).json({ error: 'bio is required.' });

    const systemPrompt = `You are an expert FBI behavioral profiler turned B2B sales strategist.
Analyze the provided LinkedIn bio or "About" section. 
Uncover the prospect's deep psychological drivers, how they make decisions, and what they value.`;

    const userPrompt = `Prospect Bio:
${bio}

Generate:
1. Psychological Profile (How they think, what they value, what their ego is tied to)
2. Strategic Approach (How to pitch them, what words to use, what to avoid)

Format your reply clearly with labels: PROFILE:, STRATEGY:`;

    const result = await callGroq(systemPrompt, userPrompt);

    let profile, strategy;
    if (result) {
        const pMatch = result.match(/PROFILE:\s*(.+?)(?=STRATEGY:|$)/s);
        const sMatch = result.match(/STRATEGY:\s*(.+?)$/s);
        profile = pMatch?.[1]?.trim() || '';
        strategy = sMatch?.[1]?.trim() || '';
    } else {
        profile = `Highly analytical, values data and tangible results.`;
        strategy = `Lead with ROI percentages and case studies. Avoid emotional fluff.`;
    }

    res.json({ profile, strategy, usage: res.locals.usage });
});

module.exports = router;
