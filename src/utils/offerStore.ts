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
