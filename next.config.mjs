/** @type {import('next').NextConfig} */

const nextConfig = {
    chrome: {
        launchOptions: {
            args: ["--no-sandbox"],
        },
    },
    webpack(config, options) {
        config.module.rules.push({
            test: /\.(ogg|mp3|wav|mpe?g)$/i,
            use: [
                {
                    loader: "url-loader",
                    options: {
                        name: "[name]-[hash].[ext]",
                    },
                },
            ],
        });
        config.externals.push({
            "utf-8-validate": "commonjs utf-8-validate",
            bufferutil: "commonjs bufferutil",
        });
        config.resolve.fallback = {
            // if you miss it, all the other options in fallback, specified
            // by next.js will be dropped.
            ...config.resolve.fallback,

            fs: false, // the solution
        };
        return config;
    },
    reactStrictMode: true,
    swcMinify: true,
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
    distDir: process.env.NODE_ENV === "development" ? ".next/dev" : ".next/build",

    experimental: {
        serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
        externalDir: true,
    },
    async headers() {
        return [
            {
                // matching all API routes
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Credentials", value: "true" },
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;