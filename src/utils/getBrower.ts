import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

const CHROMIUM_PATH =
    "https://vomrghiulbmrfvmhlflk.supabase.co/storage/v1/object/public/chromium-pack/chromium-v123.0.0-pack.tar";

export const getBrowser = async () => {
    if (process.env.VERCEL_ENV === "production") {
        console.log("production");
        const chromium = await import("@sparticuz/chromium-min").then((mod) => mod.default);

        const puppeteerCore = await import("puppeteer-core").then((mod) => mod.default);

        const executablePath = await chromium.executablePath(CHROMIUM_PATH);

        const browser = await puppeteerCore.launch({
            args: ["--no-sandbox"],
            // defaultViewport: chromium.defaultViewport,
            executablePath,
            headless: true,
        });
        return browser;
    } else {
        // const puppeteer = await import("puppeteer").then((mod) => mod.default);
        // const browser = await puppeteer.launch();
        const browser = await puppeteerCore.launch({
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless: true,
            dumpio: true,
        });
        return browser;
    }
};
