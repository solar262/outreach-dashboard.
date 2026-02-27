const Reasoning = require('./reasoning');

async function testIntelligence() {
    const leads = [
        {
            name: "Alexander Vance",
            notes: "Looking for ways to scale our sales operations without adding headcount. Current process is very manual.",
            platform: "Facebook"
        },
        {
            name: "Elena Rossi",
            notes: "Anyone have recommendations for custom AI agents? Need to automate our core workflow architectural orchestration.",
            platform: "Facebook"
        },
        {
            name: "Marcus Thorne",
            notes: "Need help with web scraping but worried about account safety and flags.",
            platform: "Facebook"
        }
    ];

    console.log("=== 🧠 Universal Intelligence Persona Verification ===\n");

    for (const lead of leads) {
        console.log(`Target: ${lead.name}`);
        console.log(`Context: "${lead.notes}"`);

        const analysis = await Reasoning.analyzeProfile(lead);
        const { message, strategy } = await Reasoning.generateStrategy(lead, analysis);

        console.log(`\n[STRATEGY] ${strategy}`);
        console.log(`[MESSAGE]  ${message}`);
        console.log(`\n${"-".repeat(50)}\n`);
    }
}

testIntelligence().catch(console.error);
