import { Offer } from "@/components/Provider";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";

const howogeUrl =
    "https://www.howoge.de/immobiliensuche/wohnungssuche.html?tx_howsite_json_list%5Bpage%5D=1&tx_howsite_json_list%5Blimit%5D=12&tx_howsite_json_list%5Blang%5D=&tx_howsite_json_list%5Bkiez%5D%5B%5D=Friedrichshain-Kreuzberg&tx_howsite_json_list%5Bkiez%5D%5B%5D=Mitte&tx_howsite_json_list%5Bkiez%5D%5B%5D=Lichtenberg&tx_howsite_json_list%5Bkiez%5D%5B%5D=Treptow-K%C3%B6penick&tx_howsite_json_list%5Bkiez%5D%5B%5D=Charlottenburg-Wilmersdorf&tx_howsite_json_list%5Bkiez%5D%5B%5D=Neuk%C3%B6lln&tx_howsite_json_list%5Bkiez%5D%5B%5D=Pankow&tx_howsite_json_list%5Bkiez%5D%5B%5D=Tempelhof-Sch%C3%B6neberg&tx_howsite_json_list%5Brooms%5D=2";

export const getHOWOGEOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(howogeUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(() => {
            const containsSpecificPattern = (inputString?: string) => {
                const pattern =
                    /^MIT\s* WBS\s*[\w\s%]*|^WBS\s*[\w\s%]*erforderlich.*|,\s*WBS\s*[\w\s%]*erforderlich|Wohnaktiv! Wohnen ab.*$/;
                return !!pattern.test(inputString || "");
            };

            const extractValidNumberSize = (inputString: string) => {
                const match = inputString.match(/\b\d+(,\d+)?\b/);
                return match ? parseFloat(match[0].replace(",", ".")) : 0;
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
            let items = document.querySelectorAll(".flat-single-grid-item");

            items.forEach((item) => {
                const address = item.querySelector(".address")?.innerText;
                const title = item.querySelector(".notice")?.innerText;

                const attributes = item.querySelectorAll(".attributes > div .attributes-content");
                const isNewBuildingProject = attributes.length === 2;

                const rooms = isNewBuildingProject ? 0 : +attributes[2].innerText;
                const size = isNewBuildingProject ? "" : attributes[1].innerText;

                const showItem =
                    address &&
                    !containsSpecificPattern(title) &&
                    containsRelevantCityCode(address) &&
                    !isNewBuildingProject &&
                    rooms !== 1 &&
                    extractValidNumberSize(size) > 68;

                if (showItem) {
                    results.push({
                        address,
                        id: item.getAttribute("data-uid") || address,
                        title,
                        region:
                            containsRelevantCityCode(address)?.district ||
                            address.split(", ")[address.split(", ").length - 1],
                        link: `https://www.howoge.de${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
                        size: size,
                        rooms: rooms,
                    });
                }
            });
            return results;
        });
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log("HOWOGE_ERROR", e);
        return { data: [], errors: e };
    }
};
