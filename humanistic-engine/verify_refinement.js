const { Reasoning } = require('./index');

async function testIntelligence() {
    console.log("--- Testing 200 IQ Reasoning ---");

    const leads = [
        {
            name: "John Doe",
            notes: "Needs to scale lead gen but worried about account bans and safety."
        },
        {
            name: "Sarah Smith",
            notes: "Spending 4 hours a day manually copy-pasting messages. It's so tedious."
        }
    ];

    for (const lead of leads) {
        console.log(`\nTesting for: ${lead.name}`);
        const analysis = await Reasoning.analyzeProfile(lead);
        const { message, strategy } = await Reasoning.generateStrategy(lead, analysis);

        console.log(`- Strategy: ${strategy}`);
        console.log(`- Generated Message: "${message}"`);
    }

    console.log("\n--- Testing Consistency Wrapper ---");
    try {
        await Reasoning.executeWithConsistency(async () => {
            console.log("Executing reliable action...");
            // Simulate success
            return true;
        });
    } catch (err) {
        console.error("Consistency test failed:", err);
    }
}

testIntelligence().catch(console.error);
