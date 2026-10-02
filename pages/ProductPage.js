
class ProductPage {

    constructor(page) {

        this.page = page;

        // Search box
        this.searchBox = page.locator(
            'input[name="q"]:not([readonly])'
        );
    }


    async searchProduct(productName) {

        console.log(
            "Searching for product:",
            productName
        );

        await this.searchBox.fill(productName);

        await this.searchBox.press("Enter");

        await this.page.waitForLoadState(
            "domcontentloaded"
        );

        await this.page.waitForTimeout(3000);

        console.log(
            "Product search completed."
        );
    }


    async addProductToCart() {

        // Select the first laptop
        const laptop = this.page
            .locator(".RG5Slk")
            .first();

        console.log(
            "Laptop count:",
            await this.page
                .locator(".RG5Slk")
                .count()
        );

        await laptop.waitFor({
            state: "visible",
            timeout: 15000
        });

        console.log(
            "Opening first laptop..."
        );


        // Wait for new product page
        const newPagePromise = this.page
            .context()
            .waitForEvent("page");


        // Click first laptop
        await laptop.click();


        // Get newly opened page
        const newPage = await newPagePromise;


        await newPage.waitForLoadState(
            "domcontentloaded"
        );

        await newPage.waitForTimeout(4000);


        console.log(
            "Product page URL:",
            newPage.url()
        );

        console.log(
            "Product page title:",
            await newPage.title()
        );


        const addToCartButton =
            newPage.locator(
                'svg:has(g[clip-path="url(#AddToCart_a)"], path[d^="M17 18.375H7.35116"])'
            ).locator(
                "xpath=ancestor::div[2]"
            ).first();


        console.log(
            "Add to Cart control count:",
            await addToCartButton.count()
        );


        if (
            await addToCartButton.count() === 0
        ) {

            throw new Error(
                "Add to Cart control was not found. Buy now is a checkout action, not an add-to-cart control."
            );
        }


        await addToCartButton.waitFor({
            state: "visible",
            timeout: 15000
        });


        console.log(
            "Add to Cart control is visible."
        );


        await addToCartButton.scrollIntoViewIfNeeded();


        await newPage.waitForTimeout(1000);


        // Print actual HTML for debugging
        console.log(
            "Add to Cart control HTML:"
        );

        console.log(
            await addToCartButton.evaluate(
                function (element) {
                    return element.outerHTML;
                }
            )
        );


        console.log(
            "Clicking Add to Cart..."
        );


        await addToCartButton.click({
            timeout: 15000
        });


        console.log(
            "Add to Cart clicked successfully."
        );


        const selectedProductName =
            (await newPage.title()).split(" Rs.")[0];


        // Update current page
        this.page = newPage;
        this.selectedProductName = selectedProductName;


        return newPage;
    }
}


module.exports = ProductPage;
