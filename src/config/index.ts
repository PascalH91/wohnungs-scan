/**
 * Centralized configuration for the apartment scanning application
 */

/**
 * Application configuration loaded from environment variables with defaults
 */
export const config = {
    // Apartment filtering criteria
    apartment: {
        minRoomSize: parseInt(process.env.NEXT_PUBLIC_MIN_ROOM_SIZE || "80", 10),
        minRoomNumber: parseInt(process.env.NEXT_PUBLIC_MIN_ROOM_NUMBER || "3", 10),
        maxColdRent: parseInt(process.env.NEXT_PUBLIC_MAX_COLD_RENT || "1900", 10),
        maxWarmRent: parseInt(process.env.NEXT_PUBLIC_MAX_WARM_RENT || "2000", 10),
    },

    // Browser and scraping configuration
    scraping: {
        defaultTimeout: parseInt(process.env.SCRAPER_DEFAULT_TIMEOUT || "60000", 10), // 60 seconds
        selectorTimeout: parseInt(process.env.SCRAPER_SELECTOR_TIMEOUT || "5000", 10), // 5 seconds
        navigationTimeout: parseInt(process.env.SCRAPER_NAVIGATION_TIMEOUT || "30000", 10), // 30 seconds
        maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES || "3", 10),
        retryDelay: parseInt(process.env.SCRAPER_RETRY_DELAY || "2000", 10), // 2 seconds
    },

    // Scrape-health alerting. Distinguishes "genuinely no flats" from a silently
    // broken scraper (changed DOM / moved URL / mangled fields) and alerts on the
    // latter. See utils/baseScraper assessHealth() and api/notify-health.
    health: {
        // A provider that USED to return listings but has been empty/unknown for
        // longer than this is flagged — catches identifier changes that silently
        // zero out a previously-working scraper. Providers with no history are not
        // baselined (no false alarms for ones that are simply usually empty).
        staleEmptyHours: parseInt(process.env.HEALTH_STALE_EMPTY_HOURS || "72", 10),
        // Don't re-email about the same unhealthy provider more often than this.
        alertThrottleHours: parseInt(process.env.HEALTH_ALERT_THROTTLE_HOURS || "12", 10),
        // Fraction of returned offers with mangled fields (HTML in size, NaN rooms)
        // above which the scrape is judged SUSPECT.
        malformedFieldThreshold: parseFloat(process.env.HEALTH_MALFORMED_FIELD_THRESHOLD || "0.5"),
    },

    // Browser pool configuration
    browserPool: {
        min: parseInt(process.env.BROWSER_POOL_MIN || "1", 10),
        max: parseInt(process.env.BROWSER_POOL_MAX || "5", 10),
        idleTimeoutMillis: parseInt(process.env.BROWSER_POOL_IDLE_TIMEOUT || "300000", 10), // 5 minutes
        acquireTimeoutMillis: parseInt(process.env.BROWSER_POOL_ACQUIRE_TIMEOUT || "30000", 10), // 30 seconds
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || "INFO",
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== "false",
    },

    // Development/production mode
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
} as const;

/**
 * Validate configuration on startup
 */
export function validateConfig(): void {
    const errors: string[] = [];

    if (config.apartment.minRoomSize <= 0) {
        errors.push("minRoomSize must be positive");
    }

    if (config.apartment.minRoomNumber <= 0) {
        errors.push("minRoomNumber must be positive");
    }

    if (config.apartment.maxColdRent <= 0) {
        errors.push("maxColdRent must be positive");
    }

    if (config.apartment.maxWarmRent <= 0) {
        errors.push("maxWarmRent must be positive");
    }

    if (config.browserPool.min < 0) {
        errors.push("browserPool.min must be non-negative");
    }

    if (config.browserPool.max < config.browserPool.min) {
        errors.push("browserPool.max must be >= browserPool.min");
    }

    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
    }
}
