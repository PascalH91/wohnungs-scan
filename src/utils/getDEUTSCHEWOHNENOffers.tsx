//@ts-nocheck

import { Offer } from "@/components/Provider";
import puppeteer from "puppeteer";

const deutscheWohnenUrl =
    "https://www.deutsche-wohnen.com/immobilienangebote#page=1&locale=de&commercializationType=rent&utilizationType=flat,retirement&location=10243&radius=10&area=60&rooms=2";

export const getDEUTSCHEWOHNENOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(deutscheWohnenUrl, { waitUntil: "networkidle2" });

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
            let items = document.querySelectorAll(".object-list__item");

            items.forEach((item) => {
                const title = item.querySelector("h2")?.innerText;
                const address = item.querySelector(".object-list__address").innerText;
                const splitAddress = address?.split(" ");
                const district = splitAddress?.[splitAddress.length - 1];

                const specs = item.querySelector(".object-list__detail-items").innerText?.split("|");

                if (title && address && containsRelevantCityCode(address)) {
                    results.push({
                        id: item.getAttribute("id") || address,
                        address,
                        title,
                        region: containsRelevantCityCode(address)?.district || district,
                        link: `https://www.deutsche-wohnen.com${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
                        size: specs[0],
                        rooms: specs[1],
                    });
                }
            });
            return results;
        });
        browser.close();
        return data;
    } catch (e: any) {
        console.log(e);
        return [];
    }
};
