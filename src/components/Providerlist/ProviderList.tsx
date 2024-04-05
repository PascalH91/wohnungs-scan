// "use client";

import React from "react";
import Image from "next/image";

// import { useSound } from "use-sound";
// import ringTone from "../../../public/sounds/ring.mp3";

import styles from "./providerList.module.scss";
import { WBM } from "../provider/WBM/WBM";
import { GEWOBAG } from "../provider/GEWOBAG/GEWOBAG";

type Provider = "WBM" | "HOWOGE" | "GEWOBAG" | "DAGEWO" | "DEUTSCHE_WOHNEN" | "FRIEDRICHSHEIM" | "STADTUNDLAND";

const providerDetails: {
    [key in Provider]: {
        id: Provider;
        name: string;
        logo?: string;
        component?: JSX.Element;
    };
} = {
    WBM: {
        id: "WBM",
        name: "WBM",
        logo: "/images/company_image_WBM_Logo_Claim_blau.jpg",
        component: <WBM />,
    },
    GEWOBAG: {
        id: "GEWOBAG",
        name: "GEWOBAG",
        logo: "/images/1280px-Gewobag_logo.svg.png",
        component: <GEWOBAG />,
    },
    FRIEDRICHSHEIM: {
        id: "FRIEDRICHSHEIM",
        name: "Friedrichsheim",
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
                        <Image
                            src={provider.logo || ""}
                            width={20}
                            height={20}
                            // sizes="20vh"
                            // style={{ width: "100%", height: "auto" }} // optional
                            alt="Picture of the author"
                        />
                        <h2 className={styles.providerHeader}>{provider.name}</h2>
                        {provider.component}
                    </div>
                );
            })}
        </div>
    );
};
