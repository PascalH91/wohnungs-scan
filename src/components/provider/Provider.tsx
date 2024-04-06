"use client";

import React, { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { useSound } from "use-sound";
import ringTone from "../../../public/sounds/ring.mp3";

import styles from "./provider.module.scss";

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

export type Provider = "WBM" | "HOWOGE" | "GEWOBAG" | "DAGEWO" | "DEUTSCHE_WOHNEN" | "FRIEDRICHSHEIM" | "STADTUNDLAND";

const fetchUrlByProvider: { [key in Provider]?: string } = {
    WBM: "wbm",
    FRIEDRICHSHEIM: "friedrichsheim",
    GEWOBAG: "gewobag",
    DEUTSCHE_WOHNEN: "deutschewohnen",
    STADTUNDLAND: "stadtundland",
};

export const Provider = ({ type }: { type: Provider }) => {
    const [play] = useSound(ringTone);
    const [number, setNumber] = useState<number>(0);
    const [run, setRun] = useState<boolean>(true);
    const [visitedIds, setVisitedIds] = useState<string[]>([]);
    const [newOfferIds, setNewOfferIds] = useState<string[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);

    const goToPage = useCallback(
        (id: string, url?: string | null) => {
            if (!url) return;
            setVisitedIds((ids) => [...ids, id]);
            const updatedNewIds = [...newOfferIds].filter((newId) => newId !== id);
            setNewOfferIds(updatedNewIds);
            setVisitedIds((ids) => [...ids, id]);
            window.open(url);
        },
        [newOfferIds],
    );

    useEffect(() => {
        if (run && fetchUrlByProvider[type]) {
            const getOffers = async () => {
                const res = await fetch(`http://localhost:3000/api/cron/${fetchUrlByProvider[type]}`);
                const { data }: { data: Offer[] } = await res.json();
                const newOffers = data.filter((data) => !offers.map((offer) => offer.id).includes(data.id));
                // console.log({ newOffers });
                if (!!newOffers.length) {
                    console.log("plaay gewobag");
                    play();
                    setNewOfferIds((ids) => [...ids, ...newOffers.map((offer) => offer.id)]);
                }
                setOffers(data as Offer[]);
                setNumber(Math.floor(Math.random() * 10));
                setRun(false);
            };
            getOffers();
        }
    }, [offers, run, play, type]);

    useEffect(() => {
        if (!run) {
            setTimeout(() => {
                setRun(true);
            }, 30000);
        }
    }, [run]);

    return (
        <div className={styles.houseEntriesWrapper}>
            {number}
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
                        </div>
                        <address>
                            {offer.region} | {offer.address}
                        </address>
                        {isNew && <div className={styles.newDot} />}
                        {offer.blocked && (
                            <div className={styles.blocked}>{`noch ${offer.daysUntilAccessible} Tage blockiert`}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
