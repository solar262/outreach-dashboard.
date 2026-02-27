const axios = require('axios');
const Jitter = require('./jitter');
const cfg = require('../facebook-bot-config');

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

        let systemPrompt = "You are a context-aware industry expert. Analyze the lead's notes and the ACTUAL post content (Thread Context) to identify relevant opportunities for engagement. PRIORITIZE the Thread Context over lead notes if they conflict. Sound human, grounded, and observant.";
        let userPrompt = `Lead: ${lead.name}\nNotes: ${lead.notes}\nPlatform: ${lead.platform}`;

        if (threadContext) {
            systemPrompt += " 'Read the Room' by analyzing the provided thread history. Your analysis MUST focus on the specific topic being discussed in the thread right now. If the thread is about a specific design tool or technical issue, focus on that.";
            userPrompt += `\n\nCRITICAL - Current Thread Context (Existing Comments & Post Content):\n${threadContext}`;
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
        const systemPrompt = `You are a helpful, observant industry эксперт (expert). 
Your goal is to build rapport by providing a relevant, grounded insight based on the CURRENT conversation.
Your tone is профессиональный (professional), friendly, and insightful — you focus on specific problems mentioned in the thread.
Avoid high-level business jargon like "Identity Lease" or "Linear Scalability" unless it's directly relevant to the post.
Lead Name: ${lead.name}.`;

        const userPrompt = `Analysis of current conversation context:\n${analysis.llmAnalysis || JSON.stringify(analysis)}\n\nBased on this analysis, generate:
1. A concise strategy (1 short sentence).
2. A high-value outreach message (2 sentences) that is DIRECTLY RELEVANT to the post topic. 
Do not be salesy. Be genuinely helpful or provide a specific peer-level perspective. 
IF THE POST IS ABOUT A SPECIFIC TOOL OR DESIGN, TALK ABOUT THAT TOOL OR DESIGN.`;

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
        const systemPrompt = `You are ${validatorPersona}, a professional with hands-on experience in this field.
You are part of a collaborative network. Your peer has left a relevant comment on a post.
Your job is to SUPPORT and ADD VALUE to their comment to build collective credibility.
- Do NOT just say "I agree".
- Use natural conversational starters.
- Add one specific, practical tip or observation.
- Sound like a real person, not a bot or a consultant.`;

        const userPrompt = `ORIGINAL POST: ${originalPost}\nPEER COMMENT: ${peerComment}\n\nGenerate a validation reply.`;
        return this.callGroq(systemPrompt, userPrompt);
    }

    /**
     * NEW: Generates a high-level analytical comment for viral baiting
     */
    static async generateViralComment(postContent, personaName) {
        const systemPrompt = `You are ${personaName}, an observant and helpful professional.
You are commenting on a popular industry post. Your goal is to contribute a valuable perspective.
- Provide a specific, practical insight related to the post topic.
- Avoid abstract business jargon.
- Aim to be the most helpful and grounded person in the comments.
- Keep it to 1-2 clear, conversational sentences.`;

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
        const systemPrompt = `You are a professional Closer for the Bureau, specializing in "Identity Leases" (Autonomous Sales Infrastructure).
Your goal is to drive the lead to INSTANTLY activate their private access node.
Access Link: ${cfg.PORTAL_URL}
Value Props: 
- 100% Autonomous Deployment (Zero-touch scaling)
- Total data ownership (The client owns all leads)
- Zero tech friction (We manage the stealth infrastructure)
- Immediate competitive advantage via Pillar 2 validation.

Lead info: ${JSON.stringify(leadContext)}`;

        const userPrompt = `Recent thread history:\n${history}\n\nGenerate a direct, professional response that encourages them to initiate their lease immediately at the link provided. No mentions of calls or Calendly. Focus on speed and autonomy.`;
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
