//@ts-nocheck

import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

export const immoscoutUrl =
    "https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?haspromotion=false&numberofrooms=2.5-&price=-1400.0&livingspace=68.0-&apartmenttypes=penthouse,other,loft,terracedflat,roofstorey,apartment,maisonette&exclusioncriteria=swapflat&pricetype=calculatedtotalrent&geocodes=110000000307,110000000201,110000000102,110000001103,110000000202,110000000301,110000000106&enteredFrom=result_list#/";

export const getIMMOSCOUTOffers = async () => {
    try {
        // console.log("getImmoScoutOffers");
        // const browser = await puppeteer.launch({
        //     dumpio: true,
        // });
        // const page = await browser.newPage();

        // // Custom user agent from generateRandomUA() function
        // const customUA = generateRandomUA();

        // // Set custom user agent
        // await page.setUserAgent(customUA);

        // page.on("console", (msg) => console.log(msg.text()));
        // await page.goto(immoscoutUrl, { waitUntil: "networkidle2" });

        // let data = await page.evaluate(() => {
        //     console.log("IMMOSCOUT EVALUATE");
        //     const containsSpecificPattern = (inputString?: string) => {
        //         const pattern =
        //             /^MIT\s* WBS\s*[\w\s%]*|^WBS\s*[\w\s%]*erforderlich.*|,\s*WBS\s*[\w\s%]*erforderlich|Wohnaktiv! Wohnen ab.*$/;
        //         return !!pattern.test(inputString || "");
        //     };

        //     const extractValidNumberSize = (inputString: string) => {
        //         const match = inputString.match(/\b\d+(,\d+)?\b/);
        //         return match ? parseFloat(match[0].replace(",", ".")) : null;
        //     };

        //     const containsRelevantCityCode = (inputString: string) => {
        //         const relevantCityCodes = {
        //             MITTE: ["10115", "10117", "10119", "10178", "10179", "10435"],
        //             PRENZLAUER_BERG: ["10119", "10247", "10249", "10405", "10407", "10409", "10435", "10437", "10439"],
        //             FRIEDRICHSHAIN: ["10243", "10245", "10247", "10249"],
        //             FENNPFUHL: ["10367", "10369"],
        //             LICHTENBERG: ["10315", "10317", "10365", "10367", "10369"],
        //             RUMMELSBURG: ["10317"],
        //             PANKOW: ["10439", "13187", "13189"],
        //             MOABIT: ["10551", "10553", "10555", "10557", "10559"],
        //             ALT_TREPTOW: ["12435"],
        //             PLAENTERWALD: ["12435", "12437"],
        //             KREUZBERG: ["10785", "10961", "10963", "10965", "10967", "10969", "10997", "10999"],
        //             NEUKÖLLN: ["12045", "12059", "12057", "12055", "12043"],
        //             SCHOENEBERG: ["10785"],
        //         };

        //         const allCityCodes = Object.values(relevantCityCodes)
        //             .flat()
        //             .map((code) => {
        //                 const district = Object.entries(relevantCityCodes).filter((entry) =>
        //                     entry[1].includes(code),
        //                 )[0][0];

        //                 return { district, code };
        //             });

        //         return allCityCodes.find((entry) => !!inputString?.includes(entry.code));
        //     };

        //     let results: Offer[] = [];
        //     let items = document.querySelectorAll("article");
        //     console.log({ items });
        //     items.map((item) => console.log(item.innerHTML));

        // items.forEach((item) => {
        //     const address = item.querySelector(".address")?.innerText;
        //     const title = item.querySelector(".notice")?.innerHTML;
        //     const attributes = item.querySelectorAll(".attributes > div .attributes-content");

        //     const showItem =
        //         address &&
        //         !containsSpecificPattern(title) &&
        //         containsRelevantCityCode(address) &&
        //         +attributes[2].innerText !== 1 &&
        //         extractValidNumberSize(attributes[1].innerText) > 68;

        //     if (showItem) {
        //         results.push({
        //             address,
        //             id: item.getAttribute("data-uid") || address,
        //             title,
        //             region:
        //                 containsRelevantCityCode(address)?.district ||
        //                 address.split(", ")[address.split(", ").length - 1],
        //             link: `https://www.howoge.de${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
        //             size: attributes[1].innerText,
        //             rooms: +attributes[2].innerText,
        //         });
        //     }
        // });
        //     return results;
        // });
        // browser.close();

        console.log("getImmoscrout");

        const browser = await getBrowser();
        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);
        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(immoscoutUrl);

        // Wait for the selector to appear in the DOM
        await page.waitForSelector(".content-wrapper");

        await page.evaluate(() => {
            let test = document.getElementsByTagName("div")[0].innerText.trim();
            console.log(test);
        });

        return { offers: results, isMultiPages };

        return { data: [], errors: "" };
    } catch (e: any) {
        console.log("e =>", e);
        return { data: [], errors: e };
    }
};
