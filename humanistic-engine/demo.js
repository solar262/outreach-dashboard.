const Jitter = require('./jitter');
const Typing = require('./typing');
const Mouse = require('./mouse');

async function runAdvancedDemo() {
    console.log("=== Humanistic Automation Engine: Full Sequence ===");

    // 1. Move to "Target"
    const start = { x: 0, y: 0 };
    const end = { x: 500, y: 300 };
    console.log(`[Humanistic] Moving mouse from (${start.x},${start.y}) to (${end.x},${end.y})...`);
    const path = Mouse.generatePath(start, end, 50);

    // Simulate movement log
    console.log(`[Humanistic] Path generated mirroring Bezier curve (${path.length} data points).`);

    // 2. Look before clicking
    await Jitter.actionGaze();
    console.log("[Humanistic] Clicked 'Message' button.");

    // 3. Compose message
    await Jitter.thinkingPause();
    console.log("\n[Humanistic] Composing message...");
    const msg = "Hey! This is a human-simulated message via the new Humanistic Engine.";
    await Typing.type(msg);

    // 4. Send
    await Jitter.thinkingPause();
    console.log("\n[Humanistic] Sent.");
}

if (require.main === module) {
    runAdvancedDemo().catch(console.error);
}
