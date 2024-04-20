import chromium from "@sparticuz/chromium-min";
import puppeteerCore from "puppeteer-core";
import locateChrome from "locate-chrome";

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

const CHROMIUM_PATH =
    "https://vomrghiulbmrfvmhlflk.supabase.co/storage/v1/object/public/chromium-pack/chromium-v123.0.0-pack.tar";

export const getBrowser = async () => {
    const browser = puppeteerCore.launch({
        args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(
            `https://github.com/Sparticuz/chromium/releases/download/v116.0.0/chromium-v116.0.0-pack.tar`,
        ),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });

    return browser;

    // const executablePath: string | undefined = await new Promise((resolve) => locateChrome((arg: any) => resolve(arg)));
    // console.log("executablePath", executablePath);

    // const browser = await puppeteerCore.launch({
    //     executablePath,
    //     args: ["--no-sandbox", "--disable-setuid-sandbox"],
    //     headless: true,
    // });
    // return browser;
};
