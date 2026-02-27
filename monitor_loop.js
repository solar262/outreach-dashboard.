const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const DURATION_MS = 30 * 60 * 1000; // 30 minutes
const POLL_INTERVAL_MS = 3 * 60 * 1000; // Poll every 3 minutes
const START_TIME = Date.now();
const END_TIME = START_TIME + DURATION_MS;

let cycle = 0;
let totalEngaged = 0;

function timeLeft() {
    const ms = END_TIME - Date.now();
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
}

async function runCycle() {
    cycle++;
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`[${timestamp}] 🧠 Monitoring Cycle #${cycle} | Time Remaining: ${timeLeft()}`);
    console.log(`${'═'.repeat(55)}`);

    try {
        // 1. Check server health
        const leadsRes = await axios.get(`${BASE_URL}/leads`);
        const allLeads = leadsRes.data;
        const newLeads = allLeads.filter(l => l.status === 'New').slice(0, 3); // Process 3 per cycle
        const outreachedCount = allLeads.filter(l => l.status === 'Outreached').length;

        console.log(`[Monitor] 📊 Dashboard Status:`);
        console.log(`   Total Leads : ${allLeads.length}`);
        console.log(`   Outreached  : ${outreachedCount}`);
        console.log(`   New (Queue) : ${newLeads.length > 0 ? newLeads.length : 0} (processing ${Math.min(newLeads.length, 3)})`);

        if (newLeads.length === 0) {
            console.log(`[Monitor] ✅ No new leads to process this cycle. System idle.`);
            return;
        }

        // 2. Run 200 IQ Reasoning on new leads
        for (const lead of newLeads) {
            console.log(`\n[Monitor] 🎯 Processing: "${lead.name.substring(0, 45)}..."`);

            try {
                const pRes = await axios.post(`${BASE_URL}/personalize`, lead);
                const { message, strategy } = pRes.data;

                console.log(`   💡 Strategy : ${strategy}`);
                console.log(`   ✉️  Message  : "${message.substring(0, 80)}..."`);

                // Run humanistic simulation
                await axios.post(`${BASE_URL}/simulate`, { message });

                // Mark as outreached
                await axios.put(`${BASE_URL}/leads/${lead.id}`, {
                    status: 'Outreached',
                    lastMessage: message
                });

                totalEngaged++;
                console.log(`   ✅ Engaged. [Session Total: ${totalEngaged}]`);
            } catch (err) {
                console.error(`   ⚠️  Failed to process lead: ${err.message}`);
            }
        }

    } catch (err) {
        console.error(`[Monitor] ❌ Server unreachable: ${err.message}. Retrying in ${POLL_INTERVAL_MS / 60000} min...`);
    }
}

async function main() {
    console.log(`\n${'█'.repeat(55)}`);
    console.log(`  🚀 30-MINUTE MONITORING SESSION STARTED`);
    console.log(`  Start : ${new Date(START_TIME).toLocaleTimeString()}`);
    console.log(`  End   : ${new Date(END_TIME).toLocaleTimeString()}`);
    console.log(`  Poll  : Every 3 minutes`);
    console.log(`${'█'.repeat(55)}\n`);

    // Run immediately, then on interval
    await runCycle();

    const interval = setInterval(async () => {
        if (Date.now() >= END_TIME) {
            clearInterval(interval);
            console.log(`\n${'█'.repeat(55)}`);
            console.log(`  ✅ 30-MINUTE MONITORING SESSION COMPLETE`);
            console.log(`  Cycles Run : ${cycle}`);
            console.log(`  Leads Engaged : ${totalEngaged}`);
            console.log(`${'█'.repeat(55)}\n`);
            process.exit(0);
        }
        await runCycle();
    }, POLL_INTERVAL_MS);
}

main().catch(console.error);
