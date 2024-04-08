import React from "react";

import styles from "./providerList.module.scss";
import { Provider, ProviderT } from "../Provider/index";

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
        logo: "/images/company_image_WBM_Logo_Claim_blau.jpg",
    },
    GEWOBAG: {
        id: "GEWOBAG",
        name: "GEWOBAG",
        logo: "/images/Gewobag.png",
    },
    FRIEDRICHSHEIM: {
        id: "FRIEDRICHSHEIM",
        name: "Friedrichsheim",
        logo: "/images/logo_Wohnungsbaugenossenschaften.jpg",
    },
    DEUTSCHE_WOHNEN: {
        id: "DEUTSCHE_WOHNEN",
        name: "Deutsche Wohnen",
        logo: "/images/Deutsche_Wohnen.png",
    },
    DAGEWO: {
        id: "DAGEWO",
        name: "DAGEWO",
        logo: "/images/dagewo.png",
    },
    STADTUNDLAND: {
        id: "STADTUNDLAND",
        name: "Stadt & Land",
        logo: "/images/stadtundland_logo.png",
    },

    HOWOGE: {
        id: "HOWOGE",
        name: "HOWOGE",
    },
};

export const ProviderList = () => {
    return (
        <div className={styles.providerListWrapper}>
            {Object.values(providerDetails).map((provider) => {
                return (
                    <Provider
                        key={provider.id}
                        provider={provider}
                    />
                );
            })}
        </div>
    );
};
