import React from "react";

import styles from "./providerList.module.scss";
import { ProviderWrapper, ProviderT } from "../Provider/index";

export type ProviderDetails = {
    id: ProviderT;
    name: string;
    logo?: string;
};
type ProviderList = {
    [key in ProviderT]: ProviderDetails;
};

const providerDetails: ProviderList = {
    WBM: {
        id: "WBM",
        name: "WBM",
        logo: "/images/wbm.jpg",
    },
    GEWOBAG: {
        id: "GEWOBAG",
        name: "GEWOBAG",
        logo: "/images/gewobag.png",
    },
    FRIEDRICHSHEIM: {
        id: "FRIEDRICHSHEIM",
        name: "Friedrichsheim",
        logo: "/images/friedrichsheim.jpg",
    },
    DEUTSCHE_WOHNEN: {
        id: "DEUTSCHE_WOHNEN",
        name: "Deutsche Wohnen",
        logo: "/images/deutsche_wohnen.png",
    },
    DAGEWO: {
        id: "DAGEWO",
        name: "DAGEWO",
        logo: "/images/dagewo.png",
    },
    STADTUNDLAND: {
        id: "STADTUNDLAND",
        name: "Stadt & Land",
        logo: "/images/stadt_und_land.png",
    },

    HOWOGE: {
        id: "HOWOGE",
        name: "HOWOGE",
        logo: "/images/howoge.png",
    },
    GESOBAU: {
        id: "GESOBAU",
        name: "GESOBAU",
        logo: "/images/gesobau.png",
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
