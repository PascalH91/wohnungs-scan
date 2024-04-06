// "use client";

import React from "react";
import Image from "next/image";

// import { useSound } from "use-sound";
// import ringTone from "../../../public/sounds/ring.mp3";

import styles from "./providerList.module.scss";
import { Provider } from "../Provider/Provider";

const providerDetails: {
    [key in Provider]: {
        id: Provider;
        name: string;
        logo?: string;
    };
} = {
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
    // const [play] = useSound(ringTone);

    return (
        <div className={styles.providerListWrapper}>
            {/* <button onClick={play}>PLAY</button> */}
            {Object.values(providerDetails).map((provider, index) => {
                return (
                    <div
                        key={provider.id}
                        className={styles.providerItem}
                    >
                        <div className={styles.providerItemHeader}>
                            <h2 className={styles.providerHeader}>{provider.name}</h2>
                            {!!provider.logo && (
                                <Image
                                    id={provider.id}
                                    key={provider.id}
                                    width={150}
                                    height={50}
                                    src={provider.logo}
                                    alt={provider.id}
                                    style={{ width: "auto" }}
                                />
                            )}
                        </div>

                        <Provider type={provider.id} />
                    </div>
                );
            })}
        </div>
    );
};
