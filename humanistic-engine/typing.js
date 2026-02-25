const Jitter = require('./jitter');

/**
 * Typing Engine: Simulates human typing behavior including variable speed and mistakes.
 */
class Typing {
    /**
     * Types text with human-like rhythm.
     * @param {string} text - The text to type.
     * @param {boolean} includeMistakes - Whether to simulate occasional typos and corrections.
     */
    static async type(text, includeMistakes = true) {
        const chars = text.split('');
        let output = "";

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];

            // Simulating a typo (occasional)
            if (includeMistakes && Math.random() > 0.98 && i > 0) {
                const keys = "qwertyuiopasdfghjklzxcvbnm";
                const randomTypo = keys[Math.floor(Math.random() * keys.length)];
                console.log(`[Humanistic] Typo: Typed '${randomTypo}' instead of '${char}'`);

                await Jitter.wait(50, 150);

                // Correction after a short "realization" pause
                await Jitter.wait(300, 600);
                console.log("[Humanistic] Correcting typo...");
                // Simulate backspace wait
                await Jitter.wait(100, 200);
            }

            // Variable speed per character
            // Faster on average, but with peaks and valleys (rhythm)
            const baseSpeed = 40;
            const variation = Math.random() * 80;
            await Jitter.wait(baseSpeed, baseSpeed + variation);

            output += char;
            process.stdout.write(char); // Demo visual
        }
        console.log("\n[Humanistic] Typing complete.");
        return output;
    }
}

module.exports = Typing;
