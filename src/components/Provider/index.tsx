import React from "react";

import { ProviderDetails } from "../Providerlist";
import Provider from "./Provider";
import { Offer, ProviderType } from "@/types";

/**
 * @deprecated Use ProviderType from @/types instead
 */
export type ProviderT = ProviderType;

/**
 * @deprecated Use Offer from @/types instead
 */
export type { Offer };

export const ProviderWrapper = ({
    provider,
    isMonitoringActive = false,
    soundEnabled = false,
}: {
    provider: ProviderDetails;
    isMonitoringActive?: boolean;
    soundEnabled?: boolean;
}) => {
    return (
        <Provider
            provider={provider}
            isMonitoringActive={isMonitoringActive}
            soundEnabled={soundEnabled}
        />
    );
};
