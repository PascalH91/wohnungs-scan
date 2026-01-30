import chromium from "@sparticuz/chromium-min";
import puppeteerCore, { Browser } from "puppeteer-core";
import locateChrome from "locate-chrome";
import _ from "lodash";
import { config } from "@/config";
import { createLogger } from "./logger";

const logger = createLogger("browser-pool");

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

// Prefer environment-provided chromium pack URL. If not set, let @sparticuz/chromium use its default CDN.
const CHROMIUM_PATH: string | undefined = process.env.CHROMIUM_PATH;

// Detect if running in Vercel or other serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

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

        if (isServerless) {
            // Use @sparticuz/chromium in serverless environments
            try {
                if (CHROMIUM_PATH) {
                    executablePath = await chromium.executablePath(CHROMIUM_PATH);
                    logger.info("Using @sparticuz/chromium with custom CHROMIUM_PATH", { source: CHROMIUM_PATH });
                } else {
                    // No custom URL configured — let the library use its default CDN/mirror
                    executablePath = await chromium.executablePath();
                    logger.info("Using @sparticuz/chromium default CDN for binary");
                }
            } catch (err: any) {
                logger.error("Failed to acquire Chromium binary in serverless environment", {
                    message: err?.message || String(err),
                    suggestion:
                        "Set CHROMIUM_PATH env var to an accessible URL for your chromium pack, or ensure @sparticuz/chromium can download from its default CDN from the deployment environment.",
                });
                throw err;
            }
        } else {
            // Use locate-chrome in local development
            executablePath = await new Promise((resolve) => locateChrome((arg: any) => resolve(arg)));
        }

        logger.info("Creating new browser instance", { currentPoolSize: this.instances.length });

        const browser = await puppeteerCore.launch({
            executablePath,
            args: isServerless
                ? chromium.args
                : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
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

// Singleton pool instance
const browserPool = new BrowserPool();

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
