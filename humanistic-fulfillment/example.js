const { Jitter, Typing, Mouse } = require('./engine/index');

async function startProject() {
    console.log("--- Initializing Humanistic Session ---");

    // 1. Simulate finding the target
    console.log("Step 1: Browsing to target profile...");
    await Jitter.thinkingPause();

    // 2. Simulate cursor movement to the 'Contact' area
    const startPos = { x: 100, y: 100 };
    const endPos = { x: 642, y: 320 };
    console.log(`Step 2: Moving cursor to interaction zone (${endPos.x}, ${endPos.y})`);
    const path = Mouse.generatePath(startPos, endPos);

    // 3. Pause to 'read' the page
    await Jitter.actionGaze();

    // 4. Enter data with human-like rhythm
    console.log("Step 3: Entering personalized message...");
    const msg = "Hi there! I saw your recent post and thought this might be a great fit. Best regards.";
    await Typing.type(msg);

    console.log("\n--- Session Complete ---");
}

startProject().catch(err => console.error("Session Failed:", err));
