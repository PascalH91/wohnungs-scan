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
        refreshRateInSeconds: 30,
        additionalBufferInSeconds: 0,
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
