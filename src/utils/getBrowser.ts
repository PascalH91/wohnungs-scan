import puppeteerCore, { Browser } from "puppeteer-core";
import locateChrome from "locate-chrome";
import { existsSync } from "fs";
import { config } from "@/config";
import { createLogger } from "./logger";

const logger = createLogger("browser-pool");

// If PUPPETEER_EXECUTABLE_PATH points to a file that doesn't exist (e.g. a
// stale shell export like `export PUPPETEER_EXECUTABLE_PATH=$(which chromium)`
// that captured the literal "chromium not found"), drop it now so we cleanly
// fall back to locate-chrome. Deleting it from the shared process.env means the
// warning fires at most once per process — even though Next dev re-evaluates
// this module per route. A valid path (e.g. Docker's /usr/bin/chromium) is kept.
if (process.env.PUPPETEER_EXECUTABLE_PATH && !existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    logger.warn("Ignoring invalid PUPPETEER_EXECUTABLE_PATH (no file there) — using locate-chrome", {
        path: process.env.PUPPETEER_EXECUTABLE_PATH,
    });
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
}

interface BrowserInstance {
    browser: Browser;
    inUse: boolean;
    createdAt: number;
    lastUsed: number;
}

class BrowserPool {
    private instances: BrowserInstance[] = [];
    private readonly minSize: number;
    private readonly maxSize: number;
    private readonly idleTimeout: number;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.minSize = config.browserPool.min;
        this.maxSize = config.browserPool.max;
        this.idleTimeout = config.browserPool.idleTimeoutMillis;
        this.startCleanup();
    }

    private async createBrowserInstance(): Promise<BrowserInstance> {
        let executablePath: string | undefined;

        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            // Explicit Chromium path for Docker/VPS (e.g. /usr/bin/chromium). Any
            // invalid value was already stripped at module load, so it exists here.
            executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
            logger.info("Using PUPPETEER_EXECUTABLE_PATH for browser binary", { path: executablePath });
        } else {
            // Local dev: locate the installed Chrome/Chromium.
            executablePath = await new Promise((resolve) => locateChrome((arg: any) => resolve(arg)));
        }

        logger.info("Creating new browser instance", { currentPoolSize: this.instances.length });

        const browser = await puppeteerCore.launch({
            executablePath,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            headless: true,
            timeout: config.browserPool.acquireTimeoutMillis,
        });

        const now = Date.now();
        return {
            browser,
            inUse: false,
            createdAt: now,
            lastUsed: now,
        };
    }

    async acquire(): Promise<Browser> {
        // Drop any instances whose underlying Chrome has died/disconnected.
        // Handing one of these back out would only surface as "socket hang up" /
        // "Target closed" on the next page operation.
        this.instances = this.instances.filter((inst) => {
            if (inst.browser.connected) return true;
            logger.warn("Discarding disconnected browser instance from pool", {
                poolSize: this.instances.length,
            });
            void inst.browser.close().catch(() => {});
            return false;
        });

        // Try to find an available instance
        const available = this.instances.find((inst) => !inst.inUse);

        if (available) {
            available.inUse = true;
            available.lastUsed = Date.now();
            logger.debug("Acquired existing browser from pool", {
                poolSize: this.instances.length,
                inUse: this.instances.filter((i) => i.inUse).length,
            });
            return available.browser;
        }

        // Create new instance if under max size
        if (this.instances.length < this.maxSize) {
            const newInstance = await this.createBrowserInstance();
            newInstance.inUse = true;
            this.instances.push(newInstance);
            logger.info("Created and acquired new browser instance", {
                poolSize: this.instances.length,
            });
            return newInstance.browser;
        }

        // Wait for an instance to become available
        logger.warn("Browser pool exhausted, waiting for available instance", {
            maxSize: this.maxSize,
        });
        return this.waitForAvailableInstance();
    }

    private async waitForAvailableInstance(): Promise<Browser> {
        const startTime = Date.now();
        const timeout = config.browserPool.acquireTimeoutMillis;

        while (Date.now() - startTime < timeout) {
            const available = this.instances.find((inst) => !inst.inUse);
            if (available) {
                available.inUse = true;
                available.lastUsed = Date.now();
                logger.info("Acquired browser after waiting");
                return available.browser;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        throw new Error("Timeout waiting for available browser instance");
    }

    release(browser: Browser): void {
        const instance = this.instances.find((inst) => inst.browser === browser);
        if (instance) {
            instance.inUse = false;
            instance.lastUsed = Date.now();
            logger.debug("Released browser back to pool", {
                poolSize: this.instances.length,
                inUse: this.instances.filter((i) => i.inUse).length,
            });
        }
    }

    private startCleanup(): void {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Run cleanup every minute
    }

    private async cleanup(): Promise<void> {
        const now = Date.now();
        const instancesToRemove: BrowserInstance[] = [];

        for (const instance of this.instances) {
            const isIdle = !instance.inUse && now - instance.lastUsed > this.idleTimeout;
            const shouldKeepMinimum = this.instances.length - instancesToRemove.length <= this.minSize;

            if (isIdle && !shouldKeepMinimum) {
                instancesToRemove.push(instance);
            }
        }

        for (const instance of instancesToRemove) {
            try {
                await instance.browser.close();
                this.instances = this.instances.filter((inst) => inst !== instance);
                logger.info("Closed idle browser instance", {
                    idleTime: now - instance.lastUsed,
                    poolSize: this.instances.length,
                });
            } catch (error) {
                logger.error("Error closing browser instance", error);
            }
        }
    }

    async shutdown(): Promise<void> {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        logger.info("Shutting down browser pool", { instanceCount: this.instances.length });

        await Promise.all(
            this.instances.map(async (instance) => {
                try {
                    await instance.browser.close();
                } catch (error) {
                    logger.error("Error closing browser during shutdown", error);
                }
            }),
        );

        this.instances = [];
        logger.info("Browser pool shutdown complete");
    }
}

// Singleton pool instance.
//
// Stored on globalThis, NOT a plain module-level const, because Next.js's dev
// server gives each route handler (/api/cron/evm, /api/cron/berlinovo, …) its
// OWN copy of imported modules. A module-level `new BrowserPool()` therefore
// creates a SEPARATE pool per route: every scrape sees an empty pool, launches a
// fresh Chrome, and — because the next route's pool holds no reference to it —
// never closes it. Those orphaned browsers pile up into hundreds of zombie
// Chrome processes until new launches fail with "socket hang up" (the system
// runs out of RAM / file descriptors). A globalThis singleton is shared across
// every module copy and survives HMR reloads, so browsers are genuinely pooled,
// reused, and cleaned up. (Same pattern used for sharing a Prisma client in Next.)
const globalForPool = globalThis as unknown as {
    __browserPool?: BrowserPool;
    __browserPoolShutdownHooked?: boolean;
};

const browserPool = (globalForPool.__browserPool ??= new BrowserPool());

// Close every browser when the process exits so Ctrl+C / container stop / a dev
// restart doesn't strand headless Chrome processes. Registered once per process
// (guarded on globalThis) to avoid stacking duplicate listeners under HMR.
if (!globalForPool.__browserPoolShutdownHooked) {
    globalForPool.__browserPoolShutdownHooked = true;
    const shutdownAndExit = (signal: NodeJS.Signals) => {
        logger.info(`Received ${signal} — closing browser pool before exit`);
        void browserPool.shutdown().finally(() => process.exit(0));
    };
    process.once("SIGINT", shutdownAndExit);
    process.once("SIGTERM", shutdownAndExit);
    // Natural, signal-less exit (event loop drained): best-effort close.
    process.once("beforeExit", () => {
        void browserPool.shutdown();
    });
}

/**
 * Get a browser from the pool
 * @deprecated Use acquireBrowser() and releaseBrowser() instead
 */
export const getBrowser = async (): Promise<Browser> => {
    logger.warn("getBrowser() is deprecated, use acquireBrowser() and releaseBrowser() instead");
    return browserPool.acquire();
};

/**
 * Acquire a browser from the pool
 */
export const acquireBrowser = async (): Promise<Browser> => {
    return browserPool.acquire();
};

/**
 * Release a browser back to the pool
 */
export const releaseBrowser = (browser: Browser): void => {
    browserPool.release(browser);
};

/**
 * Shutdown the browser pool (call on application shutdown)
 */
export const shutdownBrowserPool = async (): Promise<void> => {
    await browserPool.shutdown();
};
