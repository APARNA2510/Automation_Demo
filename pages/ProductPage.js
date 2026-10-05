
class ProductPage {

    constructor(page) {

        this.page = page;

        this.searchBox = page.locator('input[name="q"]:not([readonly])');
        this.searchResults = page.locator(".RG5Slk");
        this.noResultsMessage = page.getByText(
            /sorry,\s*no results found!/i
        ).first();
    }


    async searchProduct(productName) {

        const normalizedProductName = productName.trim();

        if (!normalizedProductName) {
            throw new Error("Product search requires a non-empty product name.");
        }

        console.log("Searching for product:", productName);

        await this.searchBox.fill(normalizedProductName);

        await this.searchBox.press("Enter");

        await this.page.waitForLoadState("domcontentloaded");

        console.log("Product search completed.");
    }

    async verifySearchResultsDisplayed() {
        await this.searchResults.first().waitFor({
            state: "visible",
            timeout: 15000
        });

        const resultCount = await this.searchResults.count();
        if (resultCount === 0) {
            throw new Error("The product search returned no matching products.");
        }
    }

    async verifyNoResultsMessage() {
        await this.noResultsMessage.waitFor({
            state: "visible",
            timeout: 15000
        });

        const resultCount = await this.searchResults.count();
        if (resultCount > 0) {
            throw new Error(
                `Expected no search results, but found ${resultCount} product cards.`
            );
        }
    }


    async addProductToCart() {
        const resultCount = await this.searchResults.count();
        console.log("Product result count:", resultCount);

        if (resultCount === 0) {
            throw new Error("Cannot add a product to the cart because no search results were found.");
        }

        const skippedProducts = [];

        for (let index = 0; index < resultCount; index += 1) {
            const product = this.searchResults.nth(index);
            await product.waitFor({
                state: "visible",
                timeout: 15000
            });
            await product.scrollIntoViewIfNeeded();

            console.log(`Opening search result ${index + 1} of ${resultCount}...`);

            const newPagePromise = this.page.context().waitForEvent("page");
            await product.click();

            const productPage = await newPagePromise;
            await productPage.waitForLoadState("domcontentloaded");
            await productPage.waitForTimeout(4000);

            const productTitle = await productPage.title();
            console.log("Product page title:", productTitle);

            const addToCartButton = productPage.locator(
                'svg:has(g[clip-path="url(#AddToCart_a)"], path[d^="M17 18.375H7.35116"])'
            ).locator("xpath=ancestor::div[2]").first();
            const outOfStockMessage = productPage.getByText(
                /out of stock|sold out|currently unavailable|currently not available/i
            ).first();
            const isMarkedOutOfStock =
                await outOfStockMessage.count() > 0 &&
                await outOfStockMessage.isVisible();
            const hasVisibleAddToCart =
                await addToCartButton.count() > 0 &&
                await addToCartButton.isVisible();

            if (isMarkedOutOfStock || !hasVisibleAddToCart) {
                const reason = isMarkedOutOfStock
                    ? "the page marks it unavailable"
                    : "no visible Add to Cart control was found";
                console.log(
                    `Skipping search result ${index + 1}: ${reason}.`
                );
                skippedProducts.push(productTitle || `search result ${index + 1}`);
                await productPage.close();
                continue;
            }

            await addToCartButton.scrollIntoViewIfNeeded();
            await productPage.waitForTimeout(1000);
            console.log("Clicking Add to Cart...");
            await addToCartButton.click({ timeout: 15000 });
            console.log("Add to Cart clicked successfully.");

            await this.closeCartConfirmationIfVisible(productPage);

            const selectedProductName = productTitle
                .split(" Rs.")[0]
                .replace(/\s+Online at Best Price On Flipkart\.com$/i, "")
                .trim();
            const selectedProductId = new URL(productPage.url())
                .pathname.match(/\/p\/([^/?]+)/i)?.[1];

            if (!selectedProductId) {
                throw new Error(
                    `Could not determine the product ID from the product page URL: ${productPage.url()}`
                );
            }

            if (index > 0) {
                console.log(
                    `Added the next available product after skipping ${index} unavailable result(s).`
                );
            }

            this.page = productPage;
            this.selectedProductName = selectedProductName;
            this.selectedProductId = selectedProductId;
            return productPage;
        }

        throw new Error(
            `Could not add any of the ${resultCount} search results to the cart. ` +
            `Skipped products: ${skippedProducts.join("; ")}`
        );
    }

    async closeCartConfirmationIfVisible(page) {
        const confirmationMessage = page.getByText(
            /1 item added to the cart/i
        ).first();

        try {
            await confirmationMessage.waitFor({
                state: "visible",
                timeout: 3000
            });
        } catch (error) {
            if (error.name !== "TimeoutError") {
                throw error;
            }

            console.log("Add-to-cart confirmation popup is not displayed.");
            return;
        }

        const closeControl = page.locator(
            '[aria-label="Close"]:visible'
        ).last();
        if (await closeControl.count() > 0) {
            await closeControl.click({
                timeout: 5000
            });
        } else {
            await page.keyboard.press("Escape");
        }

        await confirmationMessage.waitFor({
            state: "hidden",
            timeout: 5000
        });

        console.log("Add-to-cart confirmation popup closed.");
    }
}


module.exports = ProductPage;
