import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";

const dpfUrl = "https://www.dpfonline.de/interessenten/immobilien/";

export const getDPFOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(dpfUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let alertItem = document.querySelector(".uk-alert");

            if (alertItem?.innerHTML !== "Momentan gibt es keine verfügbaren Wohnung") {
                results.push({
                    address: "testAdresse",
                    id: "testAdresse",
                    title: "Es gibt eine Wohnung auf DPF!!!!",
                    region: "",
                    link: `https://www.dpfonline.de/interessenten/immobilien/`,
                    size: "0",
                    rooms: 0,
                });
            }

            // let items = document.querySelectorAll(".article-list__item--immosearch");

            // items.forEach((item) => {
            //     const address = item.querySelector(".article__meta")?.innerHTML;
            //     const title = item.querySelector(".article__title")?.innerHTML;
            //     const link = item?.getElementsByTagName("a")?.[0]?.getAttribute("href");
            //     const size = item.querySelectorAll(".article__properties-item > span")?.[1].innerText;
            //     const shortenedSize = +size.split(" ")[0].substr(0, 2);
            //     const rooms = item.querySelectorAll(".article__properties-item > span")?.[0].innerText;
            //     const shortenedRooms = +rooms.split(" ")[0];
            //     const relevantCityCode = address ? containsRelevantCityCode(address) : undefined;

            //     const filterConditions =
            //         address &&
            //         relevantCityCode &&
            //         title &&
            //         !containsSpecificPattern(title) &&
            //         shortenedSize > 68 &&
            //         shortenedRooms !== 1;

            //     if (!!filterConditions) {
            //         results.push({
            //             address,
            //             id: link || address,
            //             title,
            //             region: relevantCityCode.district,
            //             link: `https://immosuche.degewo.de/${link}`,
            //             size: shortenedSize.toString(),
            //             rooms: shortenedRooms,
            //         });
            //     }
            // });
            return results;
        });
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log(e);
        return { data: [], errors: e };
    }
};
