import { EventEmitter } from "events";
import { CONTINUOUS_MODE, CYCLE_INTERVAL_MS } from "./config.js";
import { runCycle } from "./runner.js";
/**
 * Bootstrap entry point.
 * Wiring only - all logic lives in runner.ts.
 */
// High concurrency (500+) creates many socket/stream listeners.
// Bump default limits and silence the harmless MaxListeners warning.
EventEmitter.defaultMaxListeners = 0; // 0 = unlimited
process.setMaxListeners(0);
// Filter out the noisy MaxListenersExceededWarning (does not affect runtime).
// Use --no-warnings in npm start as a stronger backup.
process.removeAllListeners("warning");
process.on("warning", (w) => {
    if (w.name === "MaxListenersExceededWarning")
        return;
    console.warn(w);
});
// Ignore orphaned socket errors from aborted proxy connections
process.on("uncaughtException", (err) => {
    if (err?.code === "ECONNRESET" ||
        err?.message?.includes("socket disconnected")) {
        return;
    }
    console.error("Unhandled exception:", err);
});
async function main() {
    if (!CONTINUOUS_MODE) {
        await runCycle();
        process.exit(0);
    }
    while (true) {
        try {
            await runCycle();
        }
        catch (err) {
            console.error("Error in cycle:", err);
        }
        console.log(`\nWaiting ${CYCLE_INTERVAL_MS / 1000}s before next cycle...`);
        await new Promise((resolve) => setTimeout(resolve, CYCLE_INTERVAL_MS));
    }
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
