"use client";

import React, { useState } from "react";

import styles from "./providerList.module.scss";
import { ProviderWrapper, ProviderT } from "../Provider/index";
import {
    wbmUrl,
    friedrichsheimUrl,
    gewobagUrl,
    deutscheWohnenUrl,
    howogeUrl,
    ebayKleinanzeigenUrl,
    dpfUrl,
    stadtUndLandUrl,
    gesobauUrl,
    dagewoUrl,
    vonoviaUrl,
    solidariaetUrl,
    neuesBerlinUrl,
    FriedrichshainEGUrl,
    berolinaUrl,
    vineta89Url,
    forumKreuzbergUrl,
    berlinovoUrl,
    paradiesUrl,
    wgVorwaertsUrl,
    evmUrl,
    vaterlandUrl,
    adlergroupUrl,
    eg1892Url,
    immoscoutUrl,
} from "@/utils/providerUrls";

export type ProviderDetails = {
    id: ProviderT;
    name: string;
    logo?: string;
    refreshRateInSeconds?: number;
    additionalBufferInSeconds?: number;
    url?: string;
};
type ProviderList = {
    [key in ProviderT]: ProviderDetails;
};

const providerDetails: ProviderList = {
    WBM: {
        id: "WBM",
        name: "WBM",
        logo: "/images/wbm.jpg",
        refreshRateInSeconds: 300,
        additionalBufferInSeconds: 60,
        url: wbmUrl,
    },

    FRIEDRICHSHEIM: {
        id: "FRIEDRICHSHEIM",
        name: "Friedrichsheim",
        logo: "/images/friedrichsheim.jpg",
        url: friedrichsheimUrl,
    },

    GEWOBAG: {
        id: "GEWOBAG",
        name: "GEWOBAG",
        logo: "/images/gewobag.png",
        url: gewobagUrl,
    },

    DEUTSCHE_WOHNEN: {
        id: "DEUTSCHE_WOHNEN",
        name: "Deutsche Wohnen",
        logo: "/images/deutsche_wohnen.png",
        url: deutscheWohnenUrl,
    },

    HOWOGE: {
        id: "HOWOGE",
        name: "HOWOGE",
        logo: "/images/howoge.png",
        url: howogeUrl,
    },

    DPF: {
        id: "DPF",
        name: "dpf",
        logo: "/images/dpf.png",
        url: dpfUrl,
    },

    STADTUNDLAND: {
        id: "STADTUNDLAND",
        name: "Stadt & Land",
        logo: "/images/stadt_und_land.png",
        url: stadtUndLandUrl,
    },

    GESOBAU: {
        id: "GESOBAU",
        name: "GESOBAU",
        logo: "/images/gesobau.png",
        url: gesobauUrl,
    },

    DAGEWO: {
        id: "DAGEWO",
        name: "DAGEWO",
        logo: "/images/dagewo.png",
        url: dagewoUrl,
    },

    VONOVIA: {
        id: "VONOVIA",
        name: "Vonovia",
        logo: "/images/vonovia.jpg",
        url: vonoviaUrl,
    },

    SOLIDARITAET: {
        id: "SOLIDARITAET",
        name: "Solidarität eG",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
        url: solidariaetUrl,
    },

    NEUES_BERLIN: {
        id: "NEUES_BERLIN",
        name: "Neues Berlin",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
        url: neuesBerlinUrl,
    },

    WBG_FRIEDRICHSHAIN_EG: {
        id: "WBG_FRIEDRICHSHAIN_EG",
        name: "WBG Friedrichshain eG",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 300,
        additionalBufferInSeconds: 60,
        url: FriedrichshainEGUrl,
    },

    BEROLINA: {
        id: "BEROLINA",
        name: "BEROLINA",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 300,
        additionalBufferInSeconds: 60,
        url: berolinaUrl,
    },

    VINETA_89: {
        id: "VINETA_89",
        name: "VINETA 89",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 400,
        additionalBufferInSeconds: 30,
        url: vineta89Url,
    },

    FORUM_KREUZBERG: {
        id: "FORUM_KREUZBERG",
        name: "Forum Kreuzberg",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
        url: forumKreuzbergUrl,
    },
    BERLINOVO: {
        id: "BERLINOVO",
        name: "Berlinovo",
        logo: "/images/berlinovo.svg",
        refreshRateInSeconds: 300,
        additionalBufferInSeconds: 30,
        url: berlinovoUrl,
    },
    PARADIES: {
        id: "PARADIES",
        name: "Paradies",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
        url: paradiesUrl,
    },

    WG_VORWAERTS: {
        id: "WG_VORWAERTS",
        name: "WG Vorwärts",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
        url: wgVorwaertsUrl,
    },

    EVM: {
        id: "EVM",
        name: "EVM",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
        url: evmUrl,
    },

    VATERLAND: {
        id: "VATERLAND",
        name: "Vaterland eG",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
        url: vaterlandUrl,
    },

    ADLERGROUP: {
        id: "ADLERGROUP",
        name: "Adler Gruppe",
        logo: "/images/adlergroup.png",
        refreshRateInSeconds: 60,
        additionalBufferInSeconds: 30,
        url: adlergroupUrl,
    },
    EBAY_KLEINANZEIGEN: {
        id: "EBAY_KLEINANZEIGEN",
        name: "Ebay Kleinanzeigen",
        logo: "/images/ebay_kleinanzeigen.jpg",
        refreshRateInSeconds: 500,
        additionalBufferInSeconds: 30,
        url: ebayKleinanzeigenUrl,
    },
    EG_1892: {
        id: "EG_1892",
        name: "1892",
        logo: "/images/friedrichsheim.jpg",
        refreshRateInSeconds: 900,
        additionalBufferInSeconds: 30,
        url: eg1892Url,
    },
    IMMOSCOUT: {
        id: "IMMOSCOUT",
        name: "ImmoScout 24",
        logo: "/images/immoscout.png",
        refreshRateInSeconds: 300,
        additionalBufferInSeconds: 30,
        url: immoscoutUrl,
    },
};

export const ProviderList = () => {
    const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

    const handleToggleMonitoring = () => {
        if (!isMonitoringActive) {
            setSoundEnabled(true);
        }
        setIsMonitoringActive(!isMonitoringActive);
    };

    return (
        <div className={styles.providerListWrapper}>
            <div
                style={{
                    position: "sticky",
                    top: "20px",
                    zIndex: 1000,
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "20px",
                }}
            >
                <button
                    onClick={handleToggleMonitoring}
                    style={{
                        padding: "15px 30px",
                        fontSize: "18px",
                        fontWeight: "bold",
                        backgroundColor: isMonitoringActive ? "#f44336" : "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        transition: "all 0.3s ease",
                    }}
                >
                    {isMonitoringActive ? "⏹️ Stop Monitoring" : "🚀 Start Monitoring"}
                </button>
            </div>
            {Object.values(providerDetails).map((provider) => {
                return (
                    <ProviderWrapper
                        key={provider.id}
                        provider={provider}
                        isMonitoringActive={isMonitoringActive}
                        soundEnabled={soundEnabled}
                    />
                );
            })}
        </div>
    );
};
