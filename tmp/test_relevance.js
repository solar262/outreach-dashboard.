const Reasoning = require('../humanistic-engine/reasoning');

async function testRelevance() {
    console.log('--- 🧪 RELEVANCE GUARDRAIL TEST 🧪 ---\n');

    // Scenario: Lead name/notes mention "Davos 2026", but Thread Context is about "UI Design"
    const misalignedLead = {
        name: 'Davos 2026 Insights',
        notes: 'Strategic insights from the 2026 World Economic Forum regarding autonomous scaling.',
        platform: 'Facebook'
    };

    const uiDesignThread = `POST CONTENT:
What is the best AI tool for web-based UI design right now? I'm looking for something that can generate layouts from prompts.

EXISTING COMMENTS:
Anh Tú Cao: Google's Stitch 
Michelle Renee: what's this?`;

    console.log('Testing misalignment: Lead="Davos", Thread="UI Design"');
    try {
        const analysis = await Reasoning.analyzeProfile(misalignedLead, uiDesignThread);
        const { message, strategy } = await Reasoning.generateStrategy(misalignedLead, analysis);

        console.log('\n[Generated Strategy]:', strategy);
        console.log('[Generated Message]:', message);

        const isIrrelevant = message.toLowerCase().includes('davos') || message.toLowerCase().includes('economic forum');
        const isRelevant = message.toLowerCase().includes('design') || message.toLowerCase().includes('layout') || message.toLowerCase().includes('ui');

        if (isIrrelevant) {
            console.error('\n❌ FAILED: Message still contains irrelevant Davos jargon.');
        } else if (isRelevant) {
            console.log('\n✅ PASSED: Message correctly focused on UI Design context.');
        } else {
            console.log('\n⚠️ NEUTRAL: Message is generic but avoided Davos.');
        }
    } catch (e) {
        console.error('ERROR during test:', e.message);
    }
}

testRelevance();
