const Reasoning = require('./humanistic-engine/reasoning');
const fs = require('fs');

async function verifyMonetization() {
    let output = '--- 🧪 STRATEGIC VERIFICATION RESULTS 🧪 ---\n\n';

    const lead = {
        name: 'John Doe',
        notes: 'Founder of a scaling SaaS company, struggling with manual outreach consistency.',
        platform: 'Facebook'
    };

    // 1. Outreach Strategy
    output += 'STEP 1: Strategic Outreach Verification...\n';
    try {
        const strategy = await Reasoning.generateStrategy(lead, { isLLM: false });
        output += `[Strategy]: ${strategy.strategy}\n`;
        output += `[Message] : ${strategy.message}\n\n`;
    } catch (e) { output += `ERROR in Step 1: ${e.message}\n\n`; }

    // 2. Closing Logic
    output += 'STEP 2: Interested Lead Closing Verification...\n';
    const history = `
Admin: Greetings John, I've noticed you're scaling fast but outreach seems to be a manual bottleneck.
John Doe: Exactly. It's taking too much time and it's hard to keep it personal at scale.
Admin: I understand the entropy there. I've engineered a Bureau infrastructure that handles this via "Identity Leverage."
John Doe: Interesting. How does that work exactly? Is it a bot?
    `;
    try {
        const closingResponse = await Reasoning.generateCloserResponse(history, lead);
        output += `[Closer Response]: ${closingResponse}\n\n`;
    } catch (e) { output += `ERROR in Step 2: ${e.message}\n\n`; }

    output += '--- ✅ VERIFICATION COMPLETE ---';
    fs.writeFileSync('monetization_results.log', output, 'utf8');
    console.log('Results written to monetization_results.log');
}

verifyMonetization().catch(err => {
    fs.writeFileSync('monetization_results.log', 'FATAL ERROR: ' + err.message, 'utf8');
});
