import React from "react";

import { ProviderDetails } from "../Providerlist";
import Provider from "./Provider";

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

export type ProviderT =
    | "WBM"
    | "HOWOGE"
    | "GEWOBAG"
    | "DAGEWO"
    | "DEUTSCHE_WOHNEN"
    | "FRIEDRICHSHEIM"
    | "STADTUNDLAND"
    | "GESOBAU"
    | "DPF"
    | "VONOVIA"
    | "IMMOSCOUT"
    | "WBG_FRIEDRICHSHAIN_EG"
    | "BEROLINA"
    | "VINETA_89"
    | "NEUES_BERLIN"
    | "FORUM_KREUZBERG"
    | "PARADIES"
    | "WG_VORWAERTS"
    | "EVM"
    | "SOLIDARITAET"
    | "VATERLAND"
    | "EBAY_KLEINANZEIGEN"
    | "EG_1892"
    | "BERLINOVO"
    | "ADLERGROUP";

export const ProviderWrapper = ({ provider }: { provider: ProviderDetails }) => {
    const url = process.env.API_URL;
    console.log("URL", url);
    return url ? <Provider provider={provider} /> : null;
};
