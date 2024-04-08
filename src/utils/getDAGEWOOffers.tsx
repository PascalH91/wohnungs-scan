//@ts-nocheck

import { Offer } from "@/components/Provider";
import puppeteer from "puppeteer";

const dagewoUrl =
    "https://immosuche.degewo.de/de/search?size=10&page=1&property_type_id=1&categories%5B%5D=1&lat=&lon=&area=&address%5Bstreet%5D=&address%5Bcity%5D=&address%5Bzipcode%5D=&address%5Bdistrict%5D=&district=33%2C+46%2C+3%2C+28%2C+29%2C+71%2C+7&property_number=&price_switch=true&price_radio=custom&price_from=&price_to=1400&qm_radio=custom&qm_from=68&qm_to=&rooms_radio=custom&rooms_from=2&rooms_to=&wbs_required=false&order=rent_total_without_vat_asc";

export const getDAGEWOOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(dagewoUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(() => {
            const containsSpecificPattern = (inputString?: string) => {
                const pattern = /,\s*WBS\s*[\w\s%]*erforderlich|Wohnaktiv! Wohnen ab.*$/;
                return !!pattern.test(inputString || "");
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
            let items = document.querySelectorAll(".article-list__item--immosearch");

            items.forEach((item) => {
                const address = item.querySelector(".article__meta")?.innerHTML;
                const title = item.querySelector(".article__title")?.innerHTML;
                const link = item?.getElementsByTagName("a")?.[0]?.getAttribute("href");
                const size = item.querySelectorAll(".article__properties-item > span")?.[1].innerText;
                const shortenedSize = +size.split(" ")[0].substr(0, 2);
                const rooms = item.querySelectorAll(".article__properties-item > span")?.[0].innerText;
                const shortenedRooms = +rooms.split(" ")[0];
                const relevantCityCode = address ? containsRelevantCityCode(address) : undefined;

                const filterConditions =
                    address &&
                    relevantCityCode &&
                    title &&
                    !containsSpecificPattern(title) &&
                    shortenedSize > 68 &&
                    shortenedRooms !== 1;

                if (!!filterConditions) {
                    results.push({
                        address,
                        id: link || address,
                        title,
                        region: relevantCityCode.district,
                        link: `https://immosuche.degewo.de/${link}`,
                        size: shortenedSize.toString(),
                        rooms: shortenedRooms,
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
