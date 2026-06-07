"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import useSound from "use-sound";
import ringTone from "../../../public/sounds/ring.mp3";
import Image from "next/image";

import styles from "./provider.module.scss";
import { ProviderT } from "./index";
import { ProviderDetails } from "../Providerlist/index";
import { transformAddressToGoogleMapsLink } from "@/utils/transformAdressToLink";
import { Offer } from "@/types";

// Maps a UI provider id to the scraper's providerName, which is the key the
// backend stores snapshots under. The frontend reads /api/offers?provider=<name>
// (a cheap read of the latest backend scrape) instead of triggering a scrape.
// WBM and IMMOSCOUT are intentionally omitted (disabled in the UI).
const providerNameById: { [key in ProviderT]?: string } = {
    HOWOGE: "HOWOGE",
    DEUTSCHE_WOHNEN: "Deutsche Wohnen",
    // WBM: "WBM",
    ADLERGROUP: "Adler Group",
    BERLINOVO: "Berlinovo",
    FRIEDRICHSHEIM: "Friedrichsheim",
    GEWOBAG: "GEWOBAG",
    DPF: "DPF",
    DAGEWO: "DAGEWO",
    GESOBAU: "GESOBAU",
    SOLIDARITAET: "Solidarität",
    WBG_FRIEDRICHSHAIN_EG: "Friedrichshain EG",
    BEROLINA: "Berolina",
    NEUES_BERLIN: "Neues Berlin",
    PARADIES: "Paradies",
    WG_VORWAERTS: "WG Vorwärts",
    FORUM_KREUZBERG: "Forum Kreuzberg",
    EG_1892: "1892",
    VATERLAND: "Vaterland",
    VINETA_89: "Vineta 89",
    VONOVIA: "Vonovia",
    EBAY_KLEINANZEIGEN: "Ebay Kleinanzeigen",
    STADTUNDLAND: "Stadt und Land",
    EVM: "EVM",
    //IMMOSCOUT: "ImmobilienScout24",
};

const Provider = ({
    provider,
    isMonitoringActive = false,
    soundEnabled = false,
}: {
    provider: ProviderDetails;
    isMonitoringActive?: boolean;
    soundEnabled?: boolean;
}) => {
    const [play] = useSound(ringTone);
    const [number, setNumber] = useState<number>(0);
    const [isInitialRender, setIsInitialRender] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [run, setRun] = useState<boolean>(false);
    const [visitedIds, setVisitedIds] = useState<string[]>([]);
    const [newOfferIds, setNewOfferIds] = useState<string[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [errorToShow, setErrorToShow] = useState<string | undefined>(undefined);
    const [isMultiPages, setIsMultiPages] = useState<boolean>(false);
    const [hasLoadedInitialOffers, setHasLoadedInitialOffers] = useState<boolean>(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const isMonitoringActiveRef = useRef<boolean>(isMonitoringActive);

    // Keep ref in sync with prop
    useEffect(() => {
        isMonitoringActiveRef.current = isMonitoringActive;
    }, [isMonitoringActive]);

    const goToPage = useCallback(
        (id: string, url?: string | null) => {
            if (!url) return;
            const updatedNewIds = [...newOfferIds].filter((newId) => newId !== id);
            setNewOfferIds(updatedNewIds);
            setVisitedIds((ids) => [...ids, id]);
            window.open(url);
        },
        [newOfferIds],
    );

    useEffect(() => {
        setIsInitialRender(false);
    }, []);

    // Start monitoring when global monitoring is activated
    useEffect(() => {
        if (isMonitoringActive && !run && !isLoading) {
            setRun(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMonitoringActive]);

    // Stop monitoring when global monitoring is deactivated
    useEffect(() => {
        if (!isMonitoringActive) {
            // Abort any in-flight requests
            if (abortController) {
                abortController.abort();
                setAbortController(null);
            }
            setRun(false);
            setIsLoading(false);
        }
    }, [isMonitoringActive, abortController]);

    useEffect(() => {
        if (!run || !providerNameById[provider.id] || isLoading || isInitialRender) {
            return;
        }

        setIsLoading(true);
        const controller = new AbortController();
        setAbortController(controller);

        const getOffers = async () => {
            try {
                const res = await fetch(`/api/offers?provider=${encodeURIComponent(providerNameById[provider.id]!)}`, {
                    signal: controller.signal,
                });
                const {
                    data: { offers: offersRes, isMultiPages: isMultiPagesRes },
                    errors,
                }: { data: { offers: Offer[]; isMultiPages: boolean }; errors: string } = await res.json();

                // Play sound on errors or multi-page detection (only if sound enabled)
                if (soundEnabled && ((!!errors && !errorToShow) || (!isMultiPages && isMultiPagesRes))) {
                    play();
                }

                setIsMultiPages(isMultiPagesRes);

                // Play sound for initial offers load (only if sound enabled).
                // This also suppresses the bell on the very first scrape against an
                // empty store, where every offer would otherwise be flagged isNew.
                if (soundEnabled && !hasLoadedInitialOffers && offersRes?.length) {
                    play();
                    setHasLoadedInitialOffers(true);
                }

                // Server-truth "new" signal: backed by firstSeenAt in the offer store,
                // so it survives reloads and short-lived disappearances of an offer.
                if (soundEnabled && hasLoadedInitialOffers) {
                    const visitedSet = new Set(visitedIds);
                    const serverNewUnvisited = offersRes?.filter((o) => o.isNew && !visitedSet.has(o.id)) ?? [];

                    if (serverNewUnvisited.length) {
                        play();
                        setNewOfferIds((ids) => [...ids, ...serverNewUnvisited.map((offer) => offer.id)]);
                    }
                }

                setErrorToShow(errors);
                setOffers(offersRes || []);
                setNumber(Math.floor(Math.random() * 10));
            } catch (error: any) {
                // Ignore abort errors - these are expected when monitoring is turned off
                if (error.name === "AbortError") {
                    console.log(`Fetch aborted for ${provider.name}`);
                    return;
                }
                console.error(`Failed to fetch offers for ${provider.name}:`, error);
                setErrorToShow(String(error));
            } finally {
                setRun(false);
                setIsLoading(false);
                setAbortController(null);
            }
        };

        getOffers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, isInitialRender, provider.id]);

    useEffect(() => {
        // Only schedule next fetch if we're not currently running and monitoring is active
        if (run || !isMonitoringActive || isInitialRender) {
            return;
        }

        const getTimoutValue = (min: number = 25, maxBuffer: number = 20) => {
            const minInMS = min * 1000;
            const maxBufferInMS = (min + maxBuffer) * 1000;
            const arbitraryFactorInMS = Math.floor(Math.random() * (maxBufferInMS - minInMS) + minInMS);
            const timeOutValue = !!min && !!maxBuffer ? arbitraryFactorInMS : minInMS;
            return timeOutValue;
        };

        const timeoutId = setTimeout(
            () => {
                // Double-check monitoring is still active when timeout fires
                if (isMonitoringActiveRef.current && !run) {
                    setRun(true);
                }
            },
            getTimoutValue(provider.refreshRateInSeconds, provider.additionalBufferInSeconds),
        );

        return () => clearTimeout(timeoutId);
    }, [
        run,
        isMonitoringActive,
        isInitialRender,
        provider.id,
        provider.refreshRateInSeconds,
        provider.additionalBufferInSeconds,
    ]);

    return errorToShow ? (
        <div
            key={provider.id}
            className={styles.providerItem}
        >
            <div className={styles.providerItemHeader}>
                <h3 className={styles.providerHeader}>{`${provider.name} _ ${number}`}</h3>
                {!!provider.logo && (
                    <div className={styles.imageWrapper}>
                        <Image
                            id={provider.id}
                            key={provider.id}
                            width={150}
                            height={30}
                            src={provider.logo}
                            alt={provider.id}
                            style={{ width: "auto" }}
                            onClick={() => goToPage(`${provider.id}_icon`, provider.url)}
                        />
                    </div>
                )}
            </div>
            <div className={styles.houseEntriesWrapper}>
                <div
                    key={`error_${provider.name}`}
                    className={clsx(styles.houseEntry, { [styles.redBoarder]: true })}
                >
                    <div className={styles.blocked}>{`ERROR => ${errorToShow}`}</div>
                </div>
            </div>
        </div>
    ) : offers.length || isMultiPages ? (
        <div
            key={provider.id}
            className={styles.providerItem}
        >
            <div className={styles.providerItemHeader}>
                <h2 className={styles.providerHeader}>{`${provider.name} _ ${number}`}</h2>
                {!!provider.logo && (
                    <div className={styles.imageWrapper}>
                        <Image
                            id={provider.id}
                            key={provider.id}
                            width={150}
                            height={30}
                            src={provider.logo}
                            alt={provider.id}
                            style={{ width: "auto" }}
                            onClick={() => goToPage(`${provider.id}_icon`, provider.url)}
                        />
                    </div>
                )}
            </div>
            <div className={styles.houseEntriesWrapper}>
                {offers.map((offer, index) => {
                    const isNew = !visitedIds.includes(offer.id);
                    return (
                        <div
                            key={offer.id}
                            className={clsx(styles.houseEntry, { [styles.isNew]: isNew })}
                        >
                            <h2
                                className={styles.entryTitle}
                                onClick={() => goToPage(offer.id, offer.link)}
                            >
                                📍 {offer.region} | {offer.title}
                            </h2>
                            <div className={styles.specsWrapper}>
                                <div className={styles.specs}>
                                    <h3>🚪 {offer.rooms}</h3>
                                    <h3>{offer.size}</h3>
                                    {/* <h3>⛶ {offer.size}</h3> */}
                                </div>
                                <a
                                    href={transformAddressToGoogleMapsLink(offer.address)}
                                    target="_blank"
                                >
                                    {offer.region} | {offer.address}
                                </a>
                            </div>
                            {isNew && <div className={styles.newDot} />}
                            {offer.blocked && (
                                <div
                                    className={styles.blocked}
                                >{`noch ${offer.daysUntilAccessible} Tage blockiert`}</div>
                            )}
                        </div>
                    );
                })}
            </div>
            {isMultiPages && (
                <div
                    className={clsx(styles.houseEntry, { [styles.isNew]: true })}
                    style={{ justifyContent: "center" }}
                >
                    <h2
                        className={styles.entryTitle}
                        onClick={() => goToPage(`${provider.id}_multiPage`, provider.url)}
                    >
                        📖📖📖📖📖📖 multiple pages 📖📖📖📖📖📖
                    </h2>
                </div>
            )}
        </div>
    ) : null;
};

export default Provider;
