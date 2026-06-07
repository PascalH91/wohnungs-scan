/**
 * Persistent store for scraped offers.
 *
 * Storage: data/offers.json at the repo root. Each offer is keyed by a stable
 * fingerprint derived from (company, title, address, rooms, size) so that the
 * same listing seen across multiple scrape cycles maps to the same record.
 *
 * The store is the foundation for downstream notifications: persistOffers()
 * returns the subset of records that were first-seen in this call.
 */
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Offer } from "@/types";
import { createLogger } from "./logger";

const logger = createLogger("offer-store");

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "offers.json");
// Latest scrape result per provider, for the frontend to read (no re-scraping).
// Kept separate from the dedup store above, which accumulates every offer ever
// seen for email purposes; this file only holds each provider's CURRENT listing.
const SNAPSHOT_PATH = path.join(STORE_DIR, "snapshots.json");
const STORE_VERSION = 1;

// Offers whose firstSeenAt falls within this window are marked isNew=true in the
// response. Must be longer than the longest scraper poll interval so a tick can
// always observe the freshness flag at least once.
const NEW_OFFER_WINDOW_MS = 15 * 60 * 1000;

export interface StoredOffer {
    id: string;
    company: string;
    title: string;
    address: string;
    rooms: string;
    size: string;
    link: string;
    firstSeenAt: string;
    lastSeenAt: string;
    /**
     * Set once an email notification for this offer has been sent. Undefined
     * means the offer is still pending notification. This is the single source
     * of truth for email dedup and survives process restarts.
     */
    notifiedAt?: string;
}

interface StoreFile {
    version: number;
    offers: Record<string, StoredOffer>;
}

function normalize(value: unknown): string {
    if (value === undefined || value === null) return "";
    return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

export function computeOfferId(company: string, offer: Offer): string {
    const parts = [
        normalize(company),
        normalize(offer.title),
        normalize(offer.address),
        normalize(offer.rooms),
        normalize(offer.size),
    ].join("|");
    return createHash("sha256").update(parts).digest("hex").slice(0, 32);
}

async function readStore(): Promise<StoreFile> {
    try {
        const raw = await fs.readFile(STORE_PATH, "utf8");
        const parsed = JSON.parse(raw) as StoreFile;
        if (!parsed.offers || typeof parsed.offers !== "object") {
            return { version: STORE_VERSION, offers: {} };
        }
        return { version: parsed.version ?? STORE_VERSION, offers: parsed.offers };
    } catch (error: any) {
        if (error.code === "ENOENT") {
            return { version: STORE_VERSION, offers: {} };
        }
        logger.warn("Failed to read offer store, treating as empty", { error: error.message });
        return { version: STORE_VERSION, offers: {} };
    }
}

async function writeStore(store: StoreFile): Promise<void> {
    await fs.mkdir(STORE_DIR, { recursive: true });
    const tmpPath = `${STORE_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tmpPath, STORE_PATH);
}

// Serialize concurrent writes from parallel scraper routes within the same process.
let writeQueue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = writeQueue.then(fn, fn);
    writeQueue = next.catch(() => undefined);
    return next;
}

/**
 * Upsert a batch of offers for a provider and return the same offers decorated
 * with `isNew`, which is true when the offer's firstSeenAt falls inside the
 * NEW_OFFER_WINDOW_MS window. firstSeenAt is permanent, so this signal survives
 * page reloads and short-lived disappearances of an offer between scrape cycles.
 */
export async function persistOffers(company: string, offers: Offer[]): Promise<Offer[]> {
    if (!offers.length) return offers;

    return withLock(async () => {
        const store = await readStore();
        const now = new Date();
        const nowIso = now.toISOString();
        const windowStart = now.getTime() - NEW_OFFER_WINDOW_MS;
        let newlyStoredCount = 0;

        const decorated: Offer[] = offers.map((offer) => {
            const id = computeOfferId(company, offer);
            const existing = store.offers[id];

            if (existing) {
                existing.lastSeenAt = nowIso;
                const isNew = Date.parse(existing.firstSeenAt) >= windowStart;
                return { ...offer, isNew };
            }

            const record: StoredOffer = {
                id,
                company,
                title: offer.title ?? "",
                address: offer.address ?? "",
                rooms: offer.rooms !== undefined ? String(offer.rooms) : "",
                size: offer.size ?? "",
                link: offer.link ?? "",
                firstSeenAt: nowIso,
                lastSeenAt: nowIso,
            };
            store.offers[id] = record;
            newlyStoredCount += 1;
            return { ...offer, isNew: true };
        });

        await writeStore(store);
        if (newlyStoredCount) {
            logger.info("Stored new offers", { company, count: newlyStoredCount });
        }

        return decorated;
    });
}

/**
 * Atomically return all stored offers that have not yet been notified and mark
 * them as notified in the same write. Because the claim and the mark happen
 * under the same lock, an offer is handed out exactly once even if scrape
 * cycles overlap — this is what guarantees you never get two emails for the
 * same listing.
 */
export async function claimUnnotifiedOffers(): Promise<StoredOffer[]> {
    return withLock(async () => {
        const store = await readStore();
        const nowIso = new Date().toISOString();

        const pending = Object.values(store.offers).filter((offer) => !offer.notifiedAt);
        if (!pending.length) return [];

        for (const offer of pending) {
            store.offers[offer.id].notifiedAt = nowIso;
        }

        await writeStore(store);
        logger.info("Claimed unnotified offers", { count: pending.length });
        return pending;
    });
}

/**
 * Mark every currently-stored offer as notified without sending anything.
 * Used as a one-time backfill when the scheduler first boots so the very first
 * run does not email the entire pre-existing backlog — only listings that
 * appear after the scheduler starts will trigger alerts.
 */
export async function markAllNotified(): Promise<number> {
    return withLock(async () => {
        const store = await readStore();
        const nowIso = new Date().toISOString();
        let marked = 0;

        for (const offer of Object.values(store.offers)) {
            if (!offer.notifiedAt) {
                offer.notifiedAt = nowIso;
                marked += 1;
            }
        }

        if (marked) {
            await writeStore(store);
            logger.info("Backfilled notifiedAt for existing offers", { count: marked });
        }
        return marked;
    });
}

// ============================================================================
// Per-provider snapshots — the frontend's read model.
//
// On each scrape the base scraper overwrites the provider's snapshot with the
// current listing (plus isMultiPages and any error). The frontend reads these
// instead of triggering a scrape, so opening the page launches zero browsers.
// ============================================================================

export interface ProviderSnapshot {
    offers: Offer[];
    isMultiPages: boolean;
    error: string;
    scrapedAt: string;
}

interface SnapshotFile {
    version: number;
    providers: Record<string, ProviderSnapshot>;
}

async function readSnapshotFile(): Promise<SnapshotFile> {
    try {
        const raw = await fs.readFile(SNAPSHOT_PATH, "utf8");
        const parsed = JSON.parse(raw) as SnapshotFile;
        if (!parsed.providers || typeof parsed.providers !== "object") {
            return { version: STORE_VERSION, providers: {} };
        }
        return { version: parsed.version ?? STORE_VERSION, providers: parsed.providers };
    } catch (error: any) {
        if (error.code === "ENOENT") {
            return { version: STORE_VERSION, providers: {} };
        }
        logger.warn("Failed to read snapshot file, treating as empty", { error: error.message });
        return { version: STORE_VERSION, providers: {} };
    }
}

async function writeSnapshotFile(file: SnapshotFile): Promise<void> {
    await fs.mkdir(STORE_DIR, { recursive: true });
    const tmpPath = `${SNAPSHOT_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(file, null, 2), "utf8");
    await fs.rename(tmpPath, SNAPSHOT_PATH);
}

/** Overwrite the current snapshot for a provider. Shares the write lock with the dedup store. */
export async function persistSnapshot(
    company: string,
    offers: Offer[],
    isMultiPages: boolean,
    error: string,
): Promise<void> {
    return withLock(async () => {
        const file = await readSnapshotFile();
        file.providers[company] = {
            offers,
            isMultiPages: Boolean(isMultiPages),
            error: error || "",
            scrapedAt: new Date().toISOString(),
        };
        await writeSnapshotFile(file);
    });
}

/** Read one provider's current snapshot, or null if it has never been scraped. */
export async function getProviderSnapshot(company: string): Promise<ProviderSnapshot | null> {
    const file = await readSnapshotFile();
    return file.providers[company] ?? null;
}
