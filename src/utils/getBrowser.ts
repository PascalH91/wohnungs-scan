import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import locateChrome from "locate-chrome";
import puppeteer from "puppeteer";

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

const CHROMIUM_PATH =
    "https://vomrghiulbmrfvmhlflk.supabase.co/storage/v1/object/public/chromium-pack/chromium-v123.0.0-pack.tar";

export const getBrowser = async () => {
    // const executablePath: string | undefined = await new Promise((resolve) => locateChrome((arg: any) => resolve(arg)));
    // console.log("executablePath", executablePath);

    // const browser = await puppeteerCore.launch({
    //     executablePath,
    //     args: ["--no-sandbox", "--disable-setuid-sandbox"],
    //     headless: true,
    // });

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });

    return browser;
};
