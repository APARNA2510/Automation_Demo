const { Before, After, setDefaultTimeout } = require("@cucumber/cucumber");
const fs = require("fs/promises");
const path = require("path");

setDefaultTimeout(60 * 1000);

Before(async function () {
    await this.init();
});

After(async function ({ pickle, result }) {
    try {
        if (!this.page || this.page.isClosed()) {
            console.warn(`Could not capture screenshot for "${pickle.name}": page is unavailable.`);
            return;
        }

        const screenshotsDirectory = path.join(__dirname, "..", "screenshots");
        await fs.mkdir(screenshotsDirectory, { recursive: true });

        const scenarioName = pickle.name
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
            .slice(0, 80);
        const status = result.status.toLowerCase();
        const screenshotPath = path.join(
            screenshotsDirectory,
            `${scenarioName}-${status}-${Date.now()}.png`
        );
        const screenshot = await this.page.screenshot({
            path: screenshotPath,
            fullPage: true
        });

        await this.attach(screenshot, "image/png");
        console.log(`Scenario ${status} screenshot saved: ${screenshotPath}`);
    } finally {
        await this.close();
    }
});
