
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

        if (typeof productName !== "string") {
            throw new Error("Product search requires a product name.");
        }

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
            timeout: 15000 //15 seconds wait
        });

        const resultCount = await this.searchResults.count();
        if (resultCount === 0) {
            throw new Error("The product search returned no matching products.");
        }
    }

    async verifyNoResultsMessage() {
        await this.noResultsMessage.waitFor({
            state: "visible",
            timeout: 15000 //15 seconds wait
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
            let productUrl;
            for (let attempt = 1; attempt <= 3; attempt += 1) {
                const product = this.searchResults.nth(index);
                try {
                    await product.waitFor({
                        state: "visible",
                        timeout: 15000
                    });
                    productUrl = await product.evaluate(element => {
                        const link = element.matches('a[href*="/p/"]')
                            ? element
                            : element.closest('a[href*="/p/"]') ||
                                element.querySelector('a[href*="/p/"]');
                        return link?.href || null;
                    });
                    if (productUrl) {
                        break;
                    }

                    throw new Error(
                        `Search result ${index + 1} does not contain a product link.`
                    );
                } catch (error) {
                    if (
                        !/not attached to the DOM/i.test(error.message) ||
                        attempt === 3
                    ) {
                        throw error;
                    }
                    await this.page.waitForTimeout(500);
                }
            }

            const productUrlObject = new URL(productUrl, this.page.url());
            if (
                productUrlObject.origin !== new URL(this.page.url()).origin ||
                !/\/p\//i.test(productUrlObject.pathname)
            ) {
                throw new Error(
                    `Search result ${index + 1} contained an invalid product URL: ${productUrl}`
                );
            }

            console.log(`Opening search result ${index + 1} of ${resultCount}...`);

            const productPage = await this.page.context().newPage();
            try {
                await productPage.goto(productUrlObject.href, {
                    waitUntil: "domcontentloaded",
                    timeout: 30000
                });
            } catch (error) {
                await productPage.close();
                throw error;
            }

            const productTitle = await productPage.title();
            console.log("Product page title:", productTitle);
            const selectedProductId = productUrlObject.pathname
                .match(/\/p\/([^/?]+)/i)?.[1];

            if (!selectedProductId) {
                await productPage.close();
                throw new Error(
                    `Could not determine the product ID from the selected search result URL: ${productUrlObject.href}`
                );
            }

            const addToCartButton = productPage.getByRole("button", {
                name: /add to cart/i
            }).first();
            const legacyAddToCartControl = productPage.locator(
                'svg:has(g[clip-path="url(#AddToCart_a)"], path[d^="M17 18.375H7.35116"])'
            ).locator("xpath=ancestor::div[2]").first();
            const outOfStockMessage = productPage.getByText(
                /out of stock|sold out|currently unavailable|currently not available/i
            ).first();
            const isMarkedOutOfStock =
                await outOfStockMessage.count() > 0 &&
                await outOfStockMessage.isVisible();
            let addToCartControl;
            let hasVisibleAddToCart = false;

            if (!isMarkedOutOfStock) {
                if (await addToCartButton.count() > 0) {
                    try {
                        await addToCartButton.waitFor({
                            state: "visible",
                            timeout: 10000
                        });
                        addToCartControl = addToCartButton;
                        hasVisibleAddToCart = true;
                    } catch (error) {
                        if (error.name !== "TimeoutError") {
                            throw error;
                        }
                    }
                }

                if (!hasVisibleAddToCart) {
                    addToCartControl = legacyAddToCartControl;
                    try {
                        await addToCartControl.waitFor({
                            state: "visible",
                            timeout: 5000
                        });
                        hasVisibleAddToCart = true;
                    } catch (error) {
                        if (error.name !== "TimeoutError") {
                            throw error;
                        }
                    }
                }
            }

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

            await addToCartControl.scrollIntoViewIfNeeded();
            await productPage.waitForTimeout(1000);
            console.log("Clicking Add to Cart...");
            await addToCartControl.click({ timeout: 15000 });
            console.log("Add to Cart clicked successfully.");

            await this.closeCartConfirmationIfVisible(productPage);

            const selectedProductName = productTitle
                .replace(/\s+Online at Best Price On Flipkart\.com$/i, "")
                .replace(/\s+Rs\..*$/i, "")
                .split(/\s+\(/, 1)[0]
                .trim();
            if (!selectedProductName) {
                throw new Error(
                    `The product page did not provide a name for cart verification. Page title: ${productTitle || "(empty)"}`
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
