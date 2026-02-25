const axios = require('axios');
const Jitter = require('./jitter');
const cfg = require('../outreach-dashboard/facebook-bot-config');

/**
 * Reasoning Engine: Universal Intelligence layer using Groq LLM.
 * Aligned with the $1B "Identity Lease" Monetization strategy.
 */
class Reasoning {
    /**
     * Internal: Calls Groq API using Llama-3.3-70b
     */
    static async callGroq(systemPrompt, userPrompt) {
        if (!cfg.GROQ_API_KEY) {
            console.warn('[Reasoning] ⚠️ GROQ_API_KEY missing. Falling back to local templates.');
            return null;
        }

        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${cfg.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content;
        } catch (err) {
            const errMsg = err.response?.data?.error?.message || err.message;
            console.error('[Reasoning] ❌ Groq API Error:', errMsg);
            return null;
        }
    }

    /**
     * Analyzes a lead's profile data through a strategic/architectural lens.
     */
    static async analyzeProfile(lead, threadContext = "") {
        console.log(`[Reasoning] Applying Universal Intelligence lens to: ${lead.name}...`);

        let systemPrompt = "You are a world-class strategic business architect. Analyze lead notes to identify 'Systemic Friction' (Operational Entropy, Linear Scalability Trap, or Execution Risk). Return a short analytical summary focused on architectural opportunity.";
        let userPrompt = `Lead: ${lead.name}\nNotes: ${lead.notes}\nPlatform: ${lead.platform}`;

        if (threadContext) {
            systemPrompt += " Also 'Read the Room' by analyzing the provided thread history (previous comments). Ensure your analysis takes the tone and context of other participants into account so the resulting outreach is uniquely superior.";
            userPrompt += `\n\nThread Context (Existing Comments):\n${threadContext}`;
        }

        const llmAnalysis = await this.callGroq(systemPrompt, userPrompt);

        if (llmAnalysis) {
            return { llmAnalysis, isLLM: true };
        }

        // Fallback to local logic
        const context = { systemicFriction: [], isLLM: false };
        const notes = lead.notes.toLowerCase();
        if (notes.includes('manual') || notes.includes('time')) context.systemicFriction.push('Operational Entropy');
        if (notes.includes('scale')) context.systemicFriction.push('Linear Scalability Trap');
        return context;
    }

    /**
     * Synthesizes a high-level strategic outreach narrative.
     * Pivot: SELLING THE IDENTITY LEASE.
     */
    static async generateStrategy(lead, analysis) {
        const systemPrompt = `You are a world-class strategic growth orchestrator. 
Your goal is to build an Unfair Advantage for your clients using autonomous Bureau infrastructure.
Your tone is executive, analytical, and slightly "insider" — you see patterns others miss.
The goal of this outreach is to pique interest in an "Identity Lease" (outcome-driven scaling).
Lead Name: ${lead.name}. Context: ${lead.notes}`;

        const userPrompt = `Analysis of lead:\n${analysis.llmAnalysis || JSON.stringify(analysis)}\n\nBased on this analysis, generate:
1. A concise strategy (1 sentence).
2. A high-value outreach message (2-3 sentences) that frames the conversation around "Strategic Autonomy" and "Identity Leverage". 
DO NOT be salesy. Be insight-driven. Focus on the value of a Bureau network.`;

        const result = await this.callGroq(systemPrompt, userPrompt);
        if (result) {
            const lines = result.split('\n\n');
            const strategy = lines[0].replace(/Strategy:|1\./gi, '').trim();
            const message = lines.slice(1).join('\n').replace(/Message:|2\./gi, '').trim();
            return { strategy, message };
        }

        // Fallback
        return {
            strategy: "Strategic Rapport",
            message: `Greetings ${lead.name.split(' ')[0]}, I've been analyzing the ${lead.notes} landscape. Most attempts at scaling fail due to linear traps—I've engineered a framework for "Identity Leverage" that might be relevant to your trajectory. Worth a brief sync?`
        };
    }

    /**
     * NEW: Generates a strategic validation reply for a peer's outreach
     */
    static async generateValidationReply(originalPost, peerComment, validatorPersona) {
        const systemPrompt = `You are ${validatorPersona}, a high-level operational consultant.
You are part of a Bureau of professionals. Your peer has left a strategic comment on a post.
Your job is to VALIDATE and EXPAND upon their comment to create massive social proof.
- Do NOT just say "I agree".
- Use phrases like "Spot on," "Indeed," "Building on that...", "Exactly right."
- Add one new layer of strategic insight.
- Sound human and executive-level.`;

        const userPrompt = `ORIGINAL POST: ${originalPost}\nPEER COMMENT: ${peerComment}\n\nGenerate a validation reply.`;
        return this.callGroq(systemPrompt, userPrompt);
    }

    /**
     * NEW: Generates a high-level analytical comment for viral baiting
     */
    static async generateViralComment(postContent, personaName) {
        const systemPrompt = `You are ${personaName}, a world-class strategic consultant.
You are commenting on a high-traffic post. Your goal is to "hijack" visibility.
- Provide a "Systemic Insight" that reframes the discussion.
- Use executive vocabulary (Operational Friction, Non-linear Scaling, Strategic Decoupling).
- Aim to be the "smartest person in the room".
- Keep it to 1-2 impactful sentences.`;

        const userPrompt = `POST CONTENT: ${postContent}\n\nGenerate an authority-building viral comment.`;
        return this.callGroq(systemPrompt, userPrompt);
    }

    /**
     * Analyzes a conversation thread to determine the lead's state.
     */
    static async analyzeThread(history) {
        const systemPrompt = `Analyze this conversation thread. Determine if the lead is:
- INTERESTED (asking how it works)
- SKEPTICAL (raising objections)
- READY (willing to jump on a call)
- COLD (no response or rejection)`;
        const userPrompt = `Thread history:\n${history}`;
        return this.callGroq(systemPrompt, userPrompt);
    }

    /**
     * Generates a conversational response intended to close or advance the deal.
     * Pivot: SELLING THE IDENTITY LEASE + SHARING SALES ASSET.
     */
    static async generateCloserResponse(history, leadContext) {
        const systemPrompt = `You are a high-ticket Closer selling "Identity Leases" (Autonomous Sales Infrastructure).
Your goal is to book a "Bureau Strategy Call" or drive the lead to the private access node.
Access Link: ${cfg.PORTAL_URL}
Value Props: 
- Total data ownership (The client owns the leads)
- Zero tech friction (We deploy the identities)
- Collective Social Proof (Pillar 2 interlinking)
Lead info: ${JSON.stringify(leadContext)}`;

        const userPrompt = `Recent thread history:\n${history}\n\nGenerate the next response to book the call. Be direct but professional.`;
        return this.callGroq(systemPrompt, userPrompt);
    }

    /**
     * Consistency Wrapper
     */
    static async executeWithConsistency(task, retries = 3) {
        let attempt = 0;
        while (attempt < retries) {
            try {
                attempt++;
                return await task();
            } catch (err) {
                if (attempt === retries) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
}

module.exports = Reasoning;
