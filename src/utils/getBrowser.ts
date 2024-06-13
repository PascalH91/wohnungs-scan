import chromium from "@sparticuz/chromium-min";
import puppeteerCore from "puppeteer-core";
import locateChrome from "locate-chrome";
import _ from "lodash";

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

const CHROMIUM_PATH =
    "https://vomrghiulbmrfvmhlflk.supabase.co/storage/v1/object/public/chromium-pack/chromium-v123.0.0-pack.tar";

export const getBrowser = async () => {
    const executablePath: string | undefined = await new Promise((resolve) => locateChrome((arg: any) => resolve(arg)));

    // const proxyList = ["181.233.93.88:8080"];

    // const proxy = _.sample(proxyList);
    // console.log("PROXY", proxy);

    const browser = await puppeteerCore.launch({
        executablePath,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            // `--proxy-server=https://${proxy}`,
            // "--ignore-certificate-errors",
            // "--ignore-certificate-errors-spki-list ",
        ],
        // protocolTimeout: 10 * 60 * 1000,
        headless: true,
    });
    return browser;
};
