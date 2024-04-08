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

export type ProviderT = "WBM" | "HOWOGE" | "GEWOBAG" | "DAGEWO" | "DEUTSCHE_WOHNEN" | "FRIEDRICHSHEIM" | "STADTUNDLAND";

const fetchUrlByProvider: { [key in ProviderT]?: string } = {
    // WBM: "wbm",
    FRIEDRICHSHEIM: "friedrichsheim",
    GEWOBAG: "gewobag",
    DEUTSCHE_WOHNEN: "deutschewohnen",
    STADTUNDLAND: "stadtundland",
    DAGEWO: "dagewo",
    HOWOGE: "howoge",
};

export const ProviderWrapper = ({ provider }: { provider: ProviderDetails }) => {
    const url = process.env.API_URL;
    return url ? (
        <Provider
            provider={provider}
            url={url}
        />
    ) : null;
};
