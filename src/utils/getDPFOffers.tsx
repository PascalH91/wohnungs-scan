import { Offer } from "@/components/Provider";
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

        let data = await page.evaluate(() => {
            const containsSpecificPattern = (inputString?: string) => {
                const pattern =
                    /^MIT\s* WBS\s*[\w\s%]*|^WBS\s*[\w\s%]*erforderlich.*|,\s*WBS\s*[\w\s%]*erforderlich|Wohnaktiv! Wohnen ab.*$/;
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

            let alertItem = document.querySelector(".uk-alert");

            if (alertItem?.innerHTML !== "Momentan gibt es keine verfügbaren Wohnung") {
                results.push({
                    address: "testAdresse",
                    id: "testAdresse",
                    title: "Es gibt eine Wohnung auf DPF!!!!",
                    region: "",
                    link: `https://www.dpfonline.de/interessenten/immobilien/`,
                    size: 0,
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
