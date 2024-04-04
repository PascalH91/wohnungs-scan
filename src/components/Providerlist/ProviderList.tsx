import React from "react";

import styles from "./providerList.module.scss";
import { WBM } from "../provider/WBM/WBM";

type Provider = "WBM" | "HOWOGE" | "GEWOBAG" | "DAGEWO" | "DEUTSCHE_WOHNEN" | "FRIEDRICHSHEIM";
const providers: { [key in Provider]: string } = {
    DAGEWO: "DAGEWO",
    WBM: "WBM",
    HOWOGE: "HOWOGE",
    GEWOBAG: "GEWOBAG",
    DEUTSCHE_WOHNEN: "Deutsche Wohnen",
    FRIEDRICHSHEIM: "Friedrichsheim",
};

const houseEntriesByProvider: { [key in Provider]?: JSX.Element } = {
    WBM: <WBM />,
};

export const ProviderList = () => {
    return (
        <div className={styles.providerListWrapper}>
            {(Object.keys(providers) as Provider[]).map((provider) => {
                return (
                    <div
                        key={provider}
                        className={styles.providerItem}
                    >
                        <h2 className={styles.providerHeader}>{providers[provider]}</h2>
                        {houseEntriesByProvider[provider]}
                    </div>
                );
            })}
        </div>
    );
};
