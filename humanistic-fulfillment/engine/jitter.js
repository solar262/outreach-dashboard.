/**
 * Jitter Engine: Implements non-uniform, natural-feeling delays.
 */
class Jitter {
    /**
     * Random delay between min and max ms.
     */
    static async wait(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Simulates a "thinking" pause which is longer and more erratic.
     */
    static async thinkingPause() {
        // 80% short pause, 20% long "distraction" pause
        const isLongPause = Math.random() > 0.8;
        if (isLongPause) {
            console.log("[Humanistic] Simulated distraction pause...");
            return this.wait(3000, 7000);
        }
        return this.wait(500, 1500);
    }

    /**
     * Natural wait for a specific action (like clicking a button).
     */
    static async actionGaze() {
        // Humans don't click instantly. They "look" at the target first.
        return this.wait(200, 600);
    }
}

module.exports = Jitter;
