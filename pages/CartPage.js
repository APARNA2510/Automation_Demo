
const fs = require("fs/promises");
const path = require("path");

class CartPage {

    constructor(page) {

        this.page = page;

        // Cart button
        this.cartButton = page.locator(
            'a[href*="/viewcart"]'
        ).first();
    }


    async openCart() {

        console.log(
            "Waiting for Cart button..."
        );

        await this.cartButton.waitFor({
            state: "visible",
            timeout: 15000
        });

        console.log(
            "Cart button is visible."
        );

        await this.cartButton.scrollIntoViewIfNeeded();

        await this.page.waitForTimeout(1000);

        console.log(
            "Clicking Cart button..."
        );

        await this.cartButton.click();
        await this.page.waitForURL(
            url => url.pathname.includes("/viewcart"),
            { timeout: 15000 }
        );

        console.log(
            "Cart button clicked."
        );

        console.log(
            "Current URL:",
            this.page.url()
        );

        console.log(
            "Current page title:",
            await this.page.title()
        );

    }


    async verifyProduct(productName) {
        const productInCart =
            this.page.getByText(
                productName,
                { exact: false }
            ).first();

        await productInCart.waitFor({
            state: "visible",
            timeout: 15000
        });

        console.log(
            "Selected product is displayed in the cart:",
            productName
        );

        await productInCart.scrollIntoViewIfNeeded();

        const screenshotsDirectory = path.join(
            __dirname,
            "..",
            "screenshots"
        );
        await fs.mkdir(screenshotsDirectory, {
            recursive: true
        });

        const screenshotPath = path.join(
            screenshotsDirectory,
            `cart-verification-${Date.now()}.png`
        );
        const screenshot = await this.page.screenshot({
            path: screenshotPath,
            fullPage: true
        });

        console.log(
            "Cart verification screenshot saved:",
            screenshotPath
        );

        await this.page.waitForTimeout(10000);

        return screenshot;
    }
}


module.exports = CartPage;
