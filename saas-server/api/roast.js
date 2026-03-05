const express = require('express');
const router = express.Router();
const cors = require('cors');
const axios = require('axios');
const cfg = require('../config');

async function callGroqDirect(systemPrompt, userPrompt) {
    if (!cfg.GROQ_API_KEY) return null;
    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.75,
            response_format: { type: "json_object" }
        }, {
            headers: {
                Authorization: `Bearer ${cfg.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });
        return response.data.choices[0].message.content;
    } catch (err) {
        console.error('[Roast Route] Groq error:', err.response?.data?.error?.message || err.message);
        return null;
    }
}

// Fallback logic if Groq is not configured
function fallbackRoast(pitch) {
    return {
        score: Math.floor(Math.random() * 40) + 20, // 20-60
        roast: "This is a fallback roast because the AI key is missing. Honestly, it probably looks exactly like every other cold email in my inbox: generic, self-centered, and asking for 15 minutes of my time. Next.",
        rewrite: "Hey there,\n\nI noticed [Specific Observation]. We actually solve [Specific Problem] for companies like [Competitor]. \n\nWorth a quick look?"
    };
}

// Endpoint: POST /api/roast
router.post('/', cors(), async (req, res) => {
    try {
        const { pitch } = req.body;
        if (!pitch) return res.status(400).json({ error: "Pitch text is required." });

        if (!cfg.GROQ_API_KEY) {
            console.log("[Roast] Fallback mode used.");
            return res.json(fallbackRoast(pitch));
        }

        const prompt = `You are a brutally honest, world-class B2B sales copywriter.
A user has submitted the following cold outreach pitch.
Your job is to analyze it, roast it (tell them exactly why it will fail), score it out of 100, and then rewrite it to be a high-converting masterpiece.

Pitch to analyze:
"${pitch}"

Respond EXACTLY in the following JSON format. Do not include markdown blocks, just the raw JSON:
{
    "score": [number between 0 and 100],
    "roast": "Your brutal, specific analysis of why this pitch is bad.",
    "rewrite": "Your improved, hyper-personalized, high-converting version of the pitch."
}`;

        const rawResult = await callGroqDirect("You are an expert copywriter returning purely JSON.", prompt);

        if (!rawResult) {
            return res.json(fallbackRoast(pitch));
        }

        const data = JSON.parse(rawResult);

        res.json(data);

    } catch (error) {
        console.error("Roast failed:", error);
        res.status(500).json({ error: "Analysis failed. The AI might be overwhelmed by how bad that pitch was." });
    }
});

module.exports = router;
