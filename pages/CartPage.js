
class CartPage {

    constructor(page) {

        this.page = page;

        // Cart button
        this.cartButton = page.locator('a[href*="/viewcart"]').first();
    }


    async openCart() {
        if (new URL(this.page.url()).pathname.includes("/viewcart")) {
            console.log("Already on the cart page.");
            return;
        }

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
        if (!new URL(this.page.url()).pathname.includes("/viewcart")) {
            throw new Error(
                `Cannot verify "${productName}" because the current page is not the cart: ${this.page.url()}`
            );
        }
        if (!productName) {
            throw new Error(
                "Cart verification requires the selected product name."
            );
        }

        const normalizedProductName = productName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
        const cartError = this.page.getByText(
            /something went wrong!\s*please try again later/i
        ).first();
        const productLinks = this.page.locator('a[href*="/p/"]');
        let retryCount = 0;

        const deadline = Date.now() + 45000;
        while (Date.now() < deadline) {
            if (await cartError.isVisible()) {
                if (retryCount >= 3) {
                    break;
                }

                const retryButton = this.page.getByText("Retry", {
                    exact: true
                }).last();
                await retryButton.waitFor({
                    state: "visible",
                    timeout: 5000
                });
                await retryButton.click();
                retryCount += 1;
                console.log(`Cart page displayed an error; retrying (${retryCount}/3).`);
                await this.page.waitForTimeout(2000);
                continue;
            }

            const productIdIsVisible = productId
                ? await productLinks.evaluateAll(
                    (links, expectedId) => links.some(link => {
                        const productIdInLink = (
                            link.getAttribute("href") || ""
                        ).match(/\/p\/([^/?]+)/i)?.[1];
                        return productIdInLink &&
                            productIdInLink.toLowerCase() ===
                                expectedId.toLowerCase();
                    }),
                    productId
                )
                : false;
            if (productIdIsVisible) {
                console.log(
                    "Selected product is displayed in the cart by product ID:",
                    productId
                );
                return;
            }

            const cartText = await this.page.locator("body").innerText();
            const normalizedCartText = cartText
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, " ")
                .trim();
            if (normalizedCartText.includes(normalizedProductName)) {
                console.log(
                    "Selected product is displayed in the cart by the stored name:",
                    productName
                );
                return;
            }

            await this.page.waitForTimeout(500);
        }

        const cartText = await this.page.locator("body").innerText();
        throw new Error(
            `Selected product "${productName}"${productId ? ` (ID: ${productId})` : ""} was not found in the cart after 45 seconds. ` +
            `Cart contents: ${cartText.trim().slice(0, 500) || "(empty)"}`
        );
    }
}


module.exports = CartPage;
