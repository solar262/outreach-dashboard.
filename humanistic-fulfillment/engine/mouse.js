/**
 * Mouse Engine: Generates human-like movement paths.
 */
class Mouse {
    /**
     * Generates a Bezier curve between two points to simulate human mouse movement.
     * @param {Object} start - {x, y}
     * @param {Object} end - {x, y}
     * @returns {Array} - Array of points along the path.
     */
    static generatePath(start, end, steps = 100) {
        // A human doesn't move in a straight line. They move in a slight curve.
        // We pick a random control point for the curve.
        const controlX = (start.x + end.x) / 2 + (Math.random() - 0.5) * 400;
        const controlY = (start.y + end.y) / 2 + (Math.random() - 0.5) * 400;

        const path = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;

            // Quadratic Bezier Formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            const x = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * end.x;
            const y = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * end.y;

            path.push({ x: Math.round(x), y: Math.round(y) });
        }
        return path;
    }

    /**
     * Simulates the variable acceleration of a human move.
     * Slow start -> Fast middle -> Slow end (Precision phase).
     */
    static getStepDelay(index, totalSteps) {
        const progress = index / totalSteps;
        // Simple easing function: (sin(p * PI / 2))
        // High delay at start and end, low in middle.
        const multiplier = Math.abs(Math.sin((progress - 0.5) * Math.PI));
        return 2 + (multiplier * 20); // 2ms to 22ms variation
    }
}

module.exports = Mouse;
