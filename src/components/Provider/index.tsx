import React from "react";

import { ProviderDetails } from "../Providerlist";
import { Provider } from "./Provider";

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
    | "1892";

export const ProviderWrapper = ({ provider }: { provider: ProviderDetails }) => {
    const url = process.env.API_URL;
    return url ? (
        <Provider
            provider={provider}
            url={url}
        />
    ) : null;
};
