const { setWorldConstructor, World } = require("@cucumber/cucumber");
const { chromium } = require("playwright");

class CustomWorld extends World {

    async init() {

        this.browser = await chromium.launch({
            headless: false,
            args: ["--start-maximized"]
        });

        this.context = await this.browser.newContext({
            viewport: null
        });

        this.page = await this.context.newPage();
    }

    async close() {

        if (this.browser) {
            await this.browser.close();
        }
    }
}

setWorldConstructor(CustomWorld);