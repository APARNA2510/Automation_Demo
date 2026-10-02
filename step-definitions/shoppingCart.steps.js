const {
    Given,
    When,
    Then
} = require("@cucumber/cucumber");

const LoginPage = require("../pages/LoginPage");
const ProductPage = require("../pages/ProductPage");
const CartPage = require("../pages/CartPage");

const config = require("../config/config");
const testData = require("../test-data/testData");


Given(
    "I am on the Flipkart home page",
    async function () {

        this.loginPage =
            new LoginPage(this.page);

        this.productPage =
            new ProductPage(this.page);

        this.cartPage =
            new CartPage(this.page);

        await this.loginPage.navigate(
            config.baseUrl
        );
    }
);


When(
    "I log in to Flipkart with my phone number",
    { timeout: 360000 },
    async function () {

        await this.loginPage.loginWithPhoneNumber();
    }
);


When(
    "I search for the selected product",
    async function () {

        await this.productPage.searchProduct(
            testData.productName
        );
    }
);


When(
    "I add the selected product to the cart",
    async function () {

        this.page =
            await this.productPage.addProductToCart();

        this.selectedProductName =
            this.productPage.selectedProductName;

        this.cartPage =
            new CartPage(this.page);
    }
);


When(
    "I navigate to the cart",
    async function () {

        await this.cartPage.openCart();
    }
);


Then(
    "the selected product should be displayed in the cart",
    async function () {

        await this.cartPage.verifyProduct(
            this.selectedProductName
        );
    }
);
