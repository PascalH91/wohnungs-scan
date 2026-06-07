/**
 * Next.js instrumentation hook — starts the background scrape scheduler so a
 * single `npm start` serves the web UI and runs the unattended scraper+email
 * loop together. Gated behind ENABLE_SCHEDULER so local `npm run dev` and
 * serverless build steps don't accidentally start hammering the providers.
 *
 * NOTE: under `next start`, register() runs on the FIRST incoming HTTP request,
 * not at process boot. So an unattended server needs at least one request to
 * kick the scheduler off — the Docker HEALTHCHECK (and the systemd warmup curl
 * in DEPLOY.md) exist to guarantee that. startScheduler() is idempotent, so
 * repeated requests are harmless.
 *
 * Requires `experimental.instrumentationHook: true` in next.config.mjs.
 */
export async function register(): Promise<void> {
    // Only run in the Node.js server runtime (not edge, not during build/export).
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    if (process.env.ENABLE_SCHEDULER !== "true") return;

    const { startScheduler } = await import("@/utils/scheduler");
    await startScheduler();
}
