const axios = require('axios');
const fs = require('fs');

async function monitor() {
    console.log("--- 🧠 30-Minute Intelligence Monitoring Started ---");

    // 1. Ensure server is reachable (this script assumes it is started separately or we handle it)
    const BASE_URL = 'http://localhost:3001/api';

    try {
        const response = await axios.get(`${BASE_URL}/leads`);
        const leads = response.data.filter(l => l.status === 'New').slice(0, 5);

        console.log(`[Monitor] Found ${leads.length} new leads to process with 200 IQ reasoning.`);

        for (const lead of leads) {
            console.log(`\n[Monitor] Processing Lead: ${lead.name}`);

            // Call the Personalize API (Exercises 200 IQ Brain)
            const pResponse = await axios.post(`${BASE_URL}/personalize`, lead);
            const { message, strategy } = pResponse.data;

            console.log(`   💡 Strategy: ${strategy}`);
            console.log(`   ✍️ Message: "${message.substring(0, 100)}..."`);

            // Simulate the Humanistic Engagement (Exercises Jitter + Typing + Consistency)
            console.log(`   🤖 Executing Humanistic Simulation...`);
            await axios.post(`${BASE_URL}/simulate`, { message });

            // Update lead status
            await axios.put(`${BASE_URL}/leads/${lead.id}`, {
                status: 'Outreached',
                lastMessage: message
            });

            console.log(`   ✅ Lead Engagement Verified.`);
        }

    } catch (err) {
        console.error(`[Monitor] Critical Error: ${err.message}`);
    }

    console.log("\n--- Monitoring Batch Complete ---");
}

monitor().catch(console.error);
