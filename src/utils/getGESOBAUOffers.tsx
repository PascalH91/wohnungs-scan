import { Offer } from "@/components/Provider";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";

const gesobauUrl =
    "https://www.gesobau.de/mieten/wohnungssuche/?tx_solr[filter][]=zimmer:%272-3%27&tx_solr[filter][]=wohnflaeche:%2768-58%27";

export const getGESOBAUOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(gesobauUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(() => {
            const containsSpecificPattern = (inputString?: string) => {
                const pattern =
                    /^MIT\s* WBS\s*[\w\s%]*|^WBS\s*[\w\s%]*erforderlich.*|,\s*WBS\s*[\w\s%]*erforderlich|Wohnaktiv! Wohnen ab.*$/;
                return !!(pattern.test(inputString || "") || inputString?.includes("mit WBS"));
            };

            const containsRelevantCityCode = (inputString: string) => {
                const relevantCityCodes = {
                    MITTE: ["10115", "10117", "10119", "10178", "10179", "10435"],
                    PRENZLAUER_BERG: ["10119", "10247", "10249", "10405", "10407", "10409", "10435", "10437", "10439"],
                    FRIEDRICHSHAIN: ["10243", "10245", "10247", "10249"],
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
                };

                const allCityCodes = Object.values(relevantCityCodes)
                    .flat()
                    .map((code) => {
                        const district = Object.entries(relevantCityCodes).filter((entry) =>
                            entry[1].includes(code),
                        )[0][0];

                        return { district, code };
                    });

                return allCityCodes.find((entry) => !!inputString?.includes(entry.code));
            };

            let results: Offer[] = [];
            let items = document.querySelectorAll(".basicTeaser__wrapper");

            items.forEach((item) => {
                const address = item.querySelector(".basicTeaser__text > span")?.innerText;
                const title = item.querySelector(".basicTeaser__title")?.innerText;
                const attributes = item.querySelectorAll(".apartment__info > span");

                const link = item
                    .querySelector(".basicTeaser__title")
                    ?.getElementsByTagName("a")[0]
                    .getAttribute("href");

                const showItem = address && !containsSpecificPattern(title) && containsRelevantCityCode(address);

                if (showItem) {
                    results.push({
                        address,
                        id: item.getAttribute("id") || link,
                        title,
                        region: containsRelevantCityCode(address)?.district || "-",
                        link: item
                            .querySelector(".basicTeaser__title")
                            ?.getElementsByTagName("a")[0]
                            .getAttribute("href"),
                        size: attributes[1]?.innerHTML,
                        rooms: +attributes[0]?.innerHTML.trim()[0],
                    });
                }
            });
            return results;
        });
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log(e);
        return { data: [], errors: e };
    }
};
