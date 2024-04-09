//@ts-nocheck

import { Offer } from "@/components/Provider";
import puppeteer from "puppeteer";
// import { JSDOM } from "jsdom";

const wbmUrl = "https://www.wbm.de/wohnungen-berlin/angebote/";

export const getWBMOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(wbmUrl, { waitUntil: "networkidle2" });

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

            let items = document.querySelectorAll(".openimmo-search-list-item") || [];

            items.forEach((item) => {
                const title = item.querySelector("h2");
                const address = item.querySelector(".address")?.innerText;
                const propertylist = item.getElementsByTagName("li");
                const isWBS = Array.from(propertylist).some((prop) => prop.innerText === "WBS");

                if (title && address && !isWBS && containsRelevantCityCode(address)) {
                    results.push({
                        address,
                        id: `${item.getAttribute("data-id")}_${item.getAttribute("data-uid")}`,
                        title: title?.innerHTML,
                        region: containsRelevantCityCode(address)?.district || item.querySelector(".area")?.innerHTML,
                        link: `https://www.wbm.de${item.querySelector(".btn-holder")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                        size: item.querySelector(".main-property-size")?.innerText,
                        rooms: +item.querySelector(".main-property-rooms")?.innerText,
                    });
                }
            });
            return results;
        });
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log(e);
        browser.close();
        return { data: [], errors: e };
    }
};
