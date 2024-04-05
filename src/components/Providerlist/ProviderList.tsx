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
        logo: "/images/1280px-Gewobag_logo.svg.png",
    },
    FRIEDRICHSHEIM: {
        id: "FRIEDRICHSHEIM",
        name: "Friedrichsheim",
        logo: "/images/logo_Wohnungsbaugenossenschaften.jpg",
    },
    DAGEWO: {
        id: "DAGEWO",
        name: "DAGEWO",
    },
    STADTUNDLAND: {
        id: "STADTUNDLAND",
        name: "Stadt & Land",
    },
    DEUTSCHE_WOHNEN: {
        id: "DEUTSCHE_WOHNEN",
        name: "Deutsche Wohnen",
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
            {Object.values(providerDetails).map((provider) => {
                return (
                    <div
                        key={provider.id}
                        className={styles.providerItem}
                    >
                        <div className={styles.providerItemHeader}>
                            <h2 className={styles.providerHeader}>{provider.name}</h2>
                            <Image
                                width={0}
                                height={0}
                                src={provider.logo || ""}
                                alt="Picture of the author"
                                style={{ height: "40px", width: "auto" }}
                                quality={100}
                            />
                        </div>

                        <Provider type={provider.id} />
                    </div>
                );
            })}
        </div>
    );
};
