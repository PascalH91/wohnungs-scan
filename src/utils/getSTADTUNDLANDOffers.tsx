//@ts-nocheck

import { Offer } from "@/components/Provider";
import puppeteer from "puppeteer";

const stadtUndLandUrl =
    "https://www.stadtundland.de/immobiliensuche.php?form=stadtundland-expose-search-1.form&sp%3Acategories%5B3352%5D%5B%5D=-&sp%3Acategories%5B3352%5D%5B%5D=__last__&sp%3AroomsFrom%5B%5D=2&sp%3AroomsTo%5B%5D=&sp%3ArentPriceFrom%5B%5D=&sp%3ArentPriceTo%5B%5D=&sp%3AareaFrom%5B%5D=65&sp%3AareaTo%5B%5D=&sp%3Afeature%5B%5D=__last__&action=submit";

export const getSTADTUNDLANDOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(stadtUndLandUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(() => {
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
            let items = document.querySelectorAll(".SP-TeaserList__item");

            items.forEach((item) => {
                const tableEntries = item.getElementsByTagName("td");
                const title = item.querySelector("h2")?.innerText;
                const address = tableEntries[1].innerText;

                if (address && title && containsRelevantCityCode(address)) {
                    results.push({
                        address,
                        id: tableEntries[0].innerText || address,
                        title,
                        region: containsRelevantCityCode(address)?.district || " - ",
                        link: `https://www.stadtundland.de${item.querySelector(".SP-Teaser__links")?.getElementsByTagName("a")[0].getAttribute("href")}`,

                        size: tableEntries[3]?.innerText,
                        rooms: tableEntries[2]?.innerText,
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
