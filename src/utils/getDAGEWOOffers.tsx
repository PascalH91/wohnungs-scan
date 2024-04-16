import { Offer } from "@/components/Provider/index";
import { generateRandomUA } from "./generateRandomUserAgents";
import { getBrowser } from "./getBrowser";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";

const dagewoUrl =
    "https://immosuche.degewo.de/de/search?size=10&page=1&property_type_id=1&categories%5B%5D=1&lat=&lon=&area=&address%5Bstreet%5D=&address%5Bcity%5D=&address%5Bzipcode%5D=&address%5Bdistrict%5D=&district=33%2C+46%2C+3%2C+28%2C+29%2C+71%2C+7&property_number=&price_switch=true&price_radio=custom&price_from=&price_to=1400&qm_radio=custom&qm_from=68&qm_to=&rooms_radio=custom&rooms_from=2&rooms_to=&wbs_required=false&order=rent_total_without_vat_asc";

export const getDAGEWOOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.exposeFunction("containsDisqualifyingPattern", (title: string) =>
            titleContainsDisqualifyingPattern(title),
        );
        await page.goto(dagewoUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];
            let items = document.querySelectorAll(".article-list__item--immosearch");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const address = item.querySelector(".article__meta")?.innerHTML;

                        const title = item.querySelector(".article__title")?.innerHTML;
                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);
                        const link = item?.getElementsByTagName("a")?.[0]?.getAttribute("href");
                        const properties = item.querySelectorAll(".article__properties-item > span");
                        const isWBS = properties?.[3]?.innerText === "mit WBS";
                        const size = properties?.[1]?.innerText;
                        const shortenedSize = +size.split(" ")[0].substr(0, 2);
                        const rooms = properties?.[0]?.innerText;
                        const shortenedRooms = +rooms.split(" ")[0];

                        const filterConditions =
                            address &&
                            title &&
                            !containsDisqualifyingPattern &&
                            !isWBS &&
                            shortenedSize > 68 &&
                            shortenedRooms !== 1;

                        if (!!filterConditions) {
                            results.push({
                                address,
                                id: link || address,
                                title,
                                region: "-",
                                link: `https://immosuche.degewo.de/${link}`,
                                size: shortenedSize.toString(),
                                rooms: shortenedRooms,
                            });
                        }
                    }),
                ));
            return results;
        });
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log(e);
        return { data: [], errors: e };
    }
};
