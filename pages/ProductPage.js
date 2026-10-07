
class ProductPage {

    constructor(page) {

        this.page = page;

        this.searchBox = page.locator('input[name="q"]:not([readonly])');
        this.searchResults = page.locator('a[href*="/p/"]:visible');
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

        try {
            await Promise.any([
                this.searchResults.first().waitFor({
                    state: "visible",
                    timeout: 30000
                }),
                this.noResultsMessage.waitFor({
                    state: "visible",
                    timeout: 30000
                })
            ]);
        } catch (error) {
            if (!(error instanceof AggregateError)) {
                throw error;
            }

            throw new Error(
                "The product search did not display results or a no-results message within 30 seconds.",
                { cause: error }
            );
        }

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
        await this.searchResults.first().waitFor({
            state: "visible",
            timeout: 15000
        });
        const productUrls = await this.searchResults.evaluateAll(links => [
            ...new Set(
                links
                    .map(link => link.href)
                    .filter(href => {
                        try {
                            return /\/p\//i.test(new URL(href).pathname);
                        } catch {
                            return false;
                        }
                    })
            )
        ]);
        const resultCount = productUrls.length;
        console.log("Product result count:", resultCount);

        if (resultCount === 0) {
            throw new Error("Cannot add a product to the cart because no search results were found.");
        }

        const skippedProducts = [];

        for (let index = 0; index < resultCount; index += 1) {
            const productUrl = productUrls[index];
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
            const addToCartIcon = productPage.locator(
                "[clip-path='url(#AddToCart_a)']"
            ).last();
            const addToCartIconControl = addToCartIcon.locator(
                "xpath=ancestor::div[2]"
            );
            const outOfStockMessage = productPage.getByText(
                /out of stock|sold out|currently unavailable|currently not available/i
            ).first();
            const isMarkedOutOfStock =
                await outOfStockMessage.count() > 0 &&
                await outOfStockMessage.isVisible();

            if (isMarkedOutOfStock) {
                console.log(
                    `Skipping search result ${index + 1}: the page marks it unavailable.`
                );
                skippedProducts.push(productTitle || `search result ${index + 1}`);
                await productPage.close();
                continue;
            }

            let navigatedToCart =
                await this.openCartFromConfirmationIfVisible(productPage);

            if (!navigatedToCart) {
                let addToCartControl;
                try {
                    await addToCartButton.waitFor({
                        state: "visible",
                        timeout: 5000
                    });
                    addToCartControl = addToCartButton;
                } catch (error) {
                    if (error.name !== "TimeoutError") {
                        throw error;
                    }
                }

                if (!addToCartControl) {
                    try {
                        await addToCartIconControl.waitFor({
                            state: "visible",
                            timeout: 10000
                        });
                        addToCartControl = addToCartIconControl;
                    } catch (error) {
                        if (error.name !== "TimeoutError") {
                            throw error;
                        }
                    }
                }

                if (!addToCartControl) {
                    console.log(
                        `Skipping search result ${index + 1}: the Add to Cart control was not visible.`
                    );
                    skippedProducts.push(productTitle || `search result ${index + 1}`);
                    await productPage.close();
                    continue;
                }

                await addToCartControl.scrollIntoViewIfNeeded();
                await productPage.waitForTimeout(1000);
                console.log(
                    addToCartControl === addToCartButton
                        ? "Clicking Add to Cart..."
                        : 'Clicking the control containing [clip-path="url(#AddToCart_a)"]...'
                );
                await addToCartControl.click({ timeout: 15000 });
                console.log("Add to Cart clicked successfully.");

                navigatedToCart =
                    await this.openCartFromConfirmationIfVisible(productPage);
            }

            if (!navigatedToCart) {
                const cartLink = productPage.locator(
                    'a[href*="/viewcart"]'
                ).first();
                await cartLink.waitFor({
                    state: "visible",
                    timeout: 15000
                });
                await cartLink.click({ timeout: 15000 });
                await productPage.waitForURL(
                    url => url.pathname.includes("/viewcart"),
                    { timeout: 15000 }
                );
                console.log("Opened the cart from the page cart link.");
            }

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

    async openCartFromConfirmationIfVisible(page) {
        const confirmationPopup = this.getCartConfirmationPopup(page);

        try {
            await confirmationPopup.waitFor({
                state: "visible",
                timeout: 3000
            });
        } catch (error) {
            if (error.name !== "TimeoutError") {
                throw error;
            }

            console.log("Add-to-cart confirmation popup is not displayed.");
            return false;
        }

        const goToCartControl = confirmationPopup.getByText("GO TO CART", {
            exact: true
        }).last();
        await goToCartControl.waitFor({
            state: "visible",
            timeout: 10000
        });
        await goToCartControl.click({ timeout: 15000 });
        await page.waitForURL(
            url => url.pathname.includes("/viewcart"),
            { timeout: 15000 }
        );
        console.log("Clicked GO TO CART in the confirmation popup.");
        return true;
    }

    getCartConfirmationPopup(page) {
        const confirmationMessage = page.getByText(
            /1 item added to the cart/i
        ).first();
        return confirmationMessage.locator(
            'xpath=ancestor::div[.//*[normalize-space(.)="GO TO CART"]][1]'
        );
    }
}


module.exports = ProductPage;
