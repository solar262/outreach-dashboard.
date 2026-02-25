const Jitter = require('./jitter');
const Typing = require('./typing');
const Reasoning = require('./reasoning');

async function runDemo() {
    console.log("=== Humanistic Automation Engine Demo ===");
    console.log("Task: Sending a personalized message...");

    await Jitter.thinkingPause();

    console.log("\nMessage Payload:");
    const message = "Hey Mark! I saw your post about needing stable lead gen automation. I've built a custom engine that handles this with natural behavior to avoid account flags. Worth a quick chat?";

    await Typing.type(message);

    await Jitter.thinkingPause();
    console.log("\nTask Complete: Lead successfully engaged.");
}

if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { Jitter, Typing, Reasoning };
