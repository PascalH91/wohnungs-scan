export {};

declare global {
    interface Window {
        containsDisqualifyingPattern: (title: string | undefined) => Promise<boolean>;
        transformSizeIntoValidNumber: (size: string | undefined) => Promise<number | null>;
        transformPriceIntoValidNumber: (size: string | undefined) => Promise<number | null>;
        isInRelevantDistrict: (code: string | undefined) => Promise<
            | {
                  district: string;
                  code: string;
              }
            | undefined
        >;
    }
}
