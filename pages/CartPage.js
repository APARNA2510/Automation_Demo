
const assert = require("node:assert/strict");

class CartPage {

    constructor(page) {

        this.page = page;

        // Cart button
        this.cartButton = page.locator('a[href*="/viewcart"]').first();
    }


    async openCart() {

        console.log("Waiting for Cart button...");

        await this.cartButton.waitFor({
            state: "visible",
            timeout: 15000
        });

        console.log("Cart button is visible.");

        await this.cartButton.scrollIntoViewIfNeeded();

        await this.page.waitForTimeout(1000);

        console.log("Clicking Cart button...");

        await this.cartButton.click();
        await this.page.waitForURL(
            url => url.pathname.includes("/viewcart"),
            { timeout: 15000 }
        );

        console.log("Cart button clicked.");

        console.log(
            "Current URL:",
            this.page.url()
        );

        console.log("Current page title:", await this.page.title());

    }


    async verifyProduct(productName, productId) {
        if (!productId) {
            throw new Error(
                `Cannot verify "${productName}" in the cart without its product ID.`
            );
        }

        const productInCart = this.page.locator(
            `a[href*="/p/${productId}"]`
        ).first();

        await productInCart.waitFor({
            state: "visible",
            timeout: 15000
        });

        assert.ok(
            await productInCart.isVisible(),
            `Expected selected product "${productName}" (ID: ${productId}) to be visible in the cart.`
        );

        console.log(
            "Selected product is displayed in the cart:",
            productName,
            `(ID: ${productId})`
        );

        await productInCart.scrollIntoViewIfNeeded();
    }
}


module.exports = CartPage;
