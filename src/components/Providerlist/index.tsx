import React from "react";

import styles from "./providerList.module.scss";
import { ProviderWrapper, ProviderT } from "../Provider/index";

export type ProviderDetails = {
    id: ProviderT;
    name: string;
    logo?: string;
    refreshRateInSeconds?: number;
    additionalBufferInSeconds?: number;
};
type ProviderList = {
    [key in ProviderT]: ProviderDetails;
};

const providerDetails: ProviderList = {
    WBM: {
        id: "WBM",
        name: "WBM",
        logo: "/images/wbm.jpg",
        refreshRateInSeconds: 20,
        additionalBufferInSeconds: 5,
    },

    FRIEDRICHSHEIM: {
        id: "FRIEDRICHSHEIM",
        name: "Friedrichsheim",
        logo: "/images/friedrichsheim.jpg",
    },

    GEWOBAG: {
        id: "GEWOBAG",
        name: "GEWOBAG",
        logo: "/images/gewobag.png",
    },

    DEUTSCHE_WOHNEN: {
        id: "DEUTSCHE_WOHNEN",
        name: "Deutsche Wohnen",
        logo: "/images/deutsche_wohnen.png",
    },

    HOWOGE: {
        id: "HOWOGE",
        name: "HOWOGE",
        logo: "/images/howoge.png",
    },
    EBAY_KLEINANZEIGEN: {
        id: "EBAY_KLEINANZEIGEN",
        name: "Ebay Kleinanzeigen",
        logo: "/images/ebay_kleinanzeigen.jpg",
        refreshRateInSeconds: 60,
        additionalBufferInSeconds: 30,
    },
    DPF: {
        id: "DPF",
        name: "dpf",
        logo: "/images/dpf.png",
    },

    STADTUNDLAND: {
        id: "STADTUNDLAND",
        name: "Stadt & Land",
        logo: "/images/stadt_und_land.png",
    },

    GESOBAU: {
        id: "GESOBAU",
        name: "GESOBAU",
        logo: "/images/gesobau.png",
    },

    DAGEWO: {
        id: "DAGEWO",
        name: "DAGEWO",
        logo: "/images/dagewo.png",
    },

    VONOVIA: {
        id: "VONOVIA",
        name: "Vonovia",
        logo: "/images/vonovia.jpg",
    },

    SOLIDARITAET: {
        id: "SOLIDARITAET",
        name: "Solidarität eG",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },

    NEUES_BERLIN: {
        id: "NEUES_BERLIN",
        name: "Neues Berlin",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },

    WBG_FRIEDRICHSHAIN_EG: {
        id: "WBG_FRIEDRICHSHAIN_EG",
        name: "WBG Friedrichshain eG",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },

    BEROLINA: {
        id: "BEROLINA",
        name: "BEROLINA",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 300,
        additionalBufferInSeconds: 30,
    },

    VINETA_89: {
        id: "VINETA_89",
        name: "VINETA 89",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 400,
        additionalBufferInSeconds: 30,
    },

    FORUM_KREUZBERG: {
        id: "FORUM_KREUZBERG",
        name: "Forum Kreuzberg",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },
    BERLINOVO: {
        id: "BERLINOVO",
        name: "Berlinovo",
        logo: "/images/berlinovo.svg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },
    PARADIES: {
        id: "PARADIES",
        name: "Paradies",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },

    WG_VORWAERTS: {
        id: "WG_VORWAERTS",
        name: "WG Vorwärts",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },

    EVM: {
        id: "EVM",
        name: "EVM",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },

    VATERLAND: {
        id: "VATERLAND",
        name: "Vaterland eG",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },

    EG_1892: {
        id: "EG_1892",
        name: "1892",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
    },
    IMMOSCOUT: {
        id: "IMMOSCOUT",
        name: "ImmoScout 24",
        logo: "/images/immoscout.png",
        refreshRateInSeconds: 60,
        additionalBufferInSeconds: 30,
    },
};

export const ProviderList = () => {
    return (
        <div className={styles.providerListWrapper}>
            {Object.values(providerDetails).map((provider) => {
                return (
                    <ProviderWrapper
                        key={provider.id}
                        provider={provider}
                    />
                );
            })}
        </div>
    );
};
