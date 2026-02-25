const Reasoning = require('./reasoning');

async function testCloserPersona() {
    const leadContext = "Elena Rossi, seeking custom AI agents for architectural orchestration. High-ticket potential.";

    const threads = [
        {
            name: "Interested & Skeptical",
            history: `
            Me: Greetings Elena, noticed your trajectory regarding custom AI agents. Most attempts at scaling fail because they rely on linear acceleration rather than systemic orchestration.
            Elena: Hi, that sounds interesting. But how do I know this won't get my Facebook account banned? I've heard bad things about bots.
            `
        },
        {
            name: "Buying Signal",
            history: `
            Me: Greetings Elena, [...] Worth a short intellectual sync about the architecture?
            Elena: Yes, I'd like to hear more. Do you have a case study or a demo of how the 'stealth-auto' layer actually works?
            `
        }
    ];

    console.log("=== 🤝 'The Closer' Persona Verification ===\n");

    for (const thread of threads) {
        console.log(`Scenario: ${thread.name}`);
        console.log(`History: ${thread.history.trim()}`);

        const analysis = await Reasoning.analyzeThread(thread.history);
        console.log(`\n[ANALYSIS] ${analysis}`);

        const response = await Reasoning.generateCloserResponse(thread.history, leadContext);
        console.log(`[RESPONSE]  ${response}`);
        console.log(`\n${"-".repeat(50)}\n`);
    }
}

testCloserPersona().catch(console.error);
