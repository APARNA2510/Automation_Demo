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

        this.loginPage = new LoginPage(this.page);

        this.productPage = new ProductPage(this.page);

        this.cartPage = new CartPage(this.page);

        await this.loginPage.navigate(config.baseUrl);
    }
);


When(
    "I open the login modal from the home page",
    async function () {

        await this.loginPage.openLoginModal();
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

        const productName = process.env.PRODUCT_NAME || testData.productName;
        await this.productPage.searchProduct(productName);
    }
);

When(
    "I search for the invalid product",
    async function () {

        await this.productPage.searchProduct(testData.invalidProductName);
    }
);

Then(
    "matching products should be displayed",
    async function () {

        await this.productPage.verifySearchResultsDisplayed();
    }
);

Then(
    "the no-results message should appear",
    async function () {

        await this.productPage.verifyNoResultsMessage();
    }
);

Given(
    "I am on the Flipkart login page",
    async function () {

        this.loginPage = new LoginPage(this.page);
        await this.loginPage.openLoginPage();
    }
);

When(
    "I enter an invalid phone number {string}",
    async function (phoneNumber) {

        await this.loginPage.enterInvalidPhoneNumber(phoneNumber);
    }
);

Then(
    "the invalid phone number error should be displayed",
    async function () {

        await this.loginPage.verifyInvalidPhoneNumberMessage();
    }
);

When(
    "I submit an incorrect OTP for the configured phone number",
    async function () {

        await this.loginPage.submitIncorrectOtp();
    }
);

Then(
    "the invalid OTP error should be displayed",
    async function () {

        await this.loginPage.verifyInvalidOtpMessage();
    }
);


When(
    "I add the first available product to the cart",
    { timeout: 360000 },
    async function () {

        this.page = await this.productPage.addProductToCart();

        this.selectedProductName = this.productPage.selectedProductName;
        this.selectedProductId = this.productPage.selectedProductId;
        console.log("Stored selected product name for cart verification:", this.selectedProductName);

        this.cartPage = new CartPage(this.page);
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
            this.selectedProductName,
            this.selectedProductId
        );
    }
);
