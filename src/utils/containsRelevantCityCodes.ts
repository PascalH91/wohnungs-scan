export const containsRelevantCityCode = async (inputString: string) => {
    const relevantCityCodes = {
        MITTE: ["10115", "10117", "10119", "10178", "10179", "10435"],
        PRENZLBERG: ["10119", "10247", "10249", "10405", "10407", "10409", "10435", "10437", "10439"],
        F_HAIN: ["10243", "10245", "10247", "10249"],
        FENNPFUHL: ["10367", "10369"],
        LICHTENBERG: ["10315", "10317", "10365", "10367", "10369"],
        RUMMELSBURG: ["10317"],
        PANKOW: ["10439", "13187", "13189"],
        MOABIT: ["10551", "10553", "10555", "10557", "10559"],
        ALT_TREPTOW: ["12435"],
        PLAENTERWALD: ["12435", "12437"],
        KREUZBERG: ["10785", "10961", "10963", "10965", "10967", "10969", "10997", "10999"],
        NEUKÖLLN: ["12045", "12059", "12057", "12055", "12043"],
        SCHOENEBERG: ["10785"],
        //TEST: ["13055", "13435", "12619", "13051", "13353", "12209", "13507", "12249"],
    };

    const allCityCodes = Object.values(relevantCityCodes)
        .flat()
        .map((code) => {
            const district = Object.entries(relevantCityCodes).filter((entry) => entry[1].includes(code))[0][0];

            return { district, code };
        });

    return allCityCodes.find((entry) => !!inputString?.includes(entry.code));
};
