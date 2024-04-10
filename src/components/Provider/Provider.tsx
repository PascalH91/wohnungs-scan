"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
//@ts-ignore
import { useSound } from "use-sound";
//@ts-ignore
import ringTone from "../../../public/sounds/ring.mp3";
import Image from "next/image";

import styles from "./provider.module.scss";
import { ProviderDetails } from "../Providerlist";
import { ProviderT } from ".";
import { time } from "console";

export type Offer = {
    id: string;
    address: string;
    title?: string;
    region?: string;
    link?: string | null;
    size?: string;
    rooms?: number | string;
    blocked?: boolean;
    daysUntilAccessible?: number;
};

const fetchUrlByProvider: { [key in ProviderT]?: string } = {
    WBM: "wbm",
    FRIEDRICHSHEIM: "friedrichsheim",
    GEWOBAG: "gewobag",
    DEUTSCHE_WOHNEN: "deutschewohnen",
    HOWOGE: "howoge",
    DPF: "dpf",
    STADTUNDLAND: "stadtundland",
    GESOBAU: "gesobau",
    DAGEWO: "dagewo",
    //IMMOSCOUT: "immoscout",
};

export const Provider = ({ provider, url }: { provider: ProviderDetails; url: string }) => {
    const [play] = useSound(ringTone);
    const [number, setNumber] = useState<number>(0);
    const [run, setRun] = useState<boolean>(true);
    const [visitedIds, setVisitedIds] = useState<string[]>([]);
    const [newOfferIds, setNewOfferIds] = useState<string[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);

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
        if (run && fetchUrlByProvider[provider.id]) {
            const getOffers = async () => {
                const res = await fetch(`/api/cron/${fetchUrlByProvider[provider.id]}`);
                const { data, errors }: { data: Offer[]; errors: string } = await res.json();
                // console.log({ type: provider.id, errors });
                const newOffers = data.filter((data) => !offers.map((offer) => offer.id).includes(data.id));

                if (!!newOffers.length) {
                    const newOfferIdsThatHaventBeenVisited = newOffers
                        .map((offer) => offer.id)
                        .filter((id) => !visitedIds.includes(id));

                    !!newOfferIdsThatHaventBeenVisited.length && play();
                    setNewOfferIds((ids) => [...ids, ...newOffers.map((offer) => offer.id)]);
                }
                setOffers(data as Offer[]);
                setNumber(Math.floor(Math.random() * 10));
                setRun(false);
            };
            getOffers();
        }
    }, [offers, run, play, provider.id, url, visitedIds]);

    useEffect(() => {
        if (!run) {
            const getTimoutValue = (min: number = 25, maxBuffer: number = 20) => {
                const minInMS = min * 1000;
                const maxBufferInMS = (min + maxBuffer) * 1000;

                const arbitraryFactorInMS = Math.floor(Math.random() * (maxBufferInMS - minInMS) + minInMS);
                const timeOutValue = !!min && !!maxBuffer ? arbitraryFactorInMS : minInMS;
                return timeOutValue;
            };

            setTimeout(
                () => {
                    setRun(true);
                },
                getTimoutValue(provider.refreshRateInSeconds, provider.additionalBufferInSeconds),
            );
        }
    }, [run, provider.id, provider.refreshRateInSeconds, provider.additionalBufferInSeconds]);

    return offers.length ? (
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
                            height={50}
                            src={provider.logo}
                            alt={provider.id}
                            style={{ width: "auto" }}
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
                            className={clsx(styles.houseEntry, { [styles.redBoarder]: isNew })}
                        >
                            <h2
                                className={styles.entryTitle}
                                onClick={() => goToPage(offer.id, offer.link)}
                            >
                                📍 {offer.region} | {offer.title}
                            </h2>
                            <div className={styles.specs}>
                                <h3>🚪 {offer.rooms}</h3>
                                <h3>⛶ {offer.size}</h3>
                                <address>
                                    {offer.region} | {offer.address}
                                </address>
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
        </div>
    ) : null;
};
