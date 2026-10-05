
const config = require("../config/config");
const userConfig = require("../test-data/userConfig.json");
const testData = require("../test-data/testData");

class LoginPage {

    constructor(page) {

        this.page = page;

        // Login popup close button
        this.loginPopupCloseButton = page.locator('button[aria-label="Close"]').first();
    }


    async navigate(url) {

        console.log("Opening Flipkart home page...");

        await this.page.goto(url);

        await this.page.waitForLoadState("domcontentloaded");

        await this.page.waitForTimeout(3000);

        console.log("Flipkart home page opened.");
    }

    async openLoginModal() {
        const loginModalHeading = this.page.getByText(
            "Log in for the best experience",
            { exact: true }
        );

        if (await loginModalHeading.isVisible()) {
            console.log("Login modal is already open.");
            return;
        }

        const loginMenuTrigger = this.page.getByText("Login", { exact: true }).first();
        await loginMenuTrigger.waitFor({
            state: "visible",
            timeout: 15000
        });
        await loginMenuTrigger.hover();

        const loginButton = this.page.getByText("Login", { exact: true }).last();
        await loginButton.waitFor({
            state: "visible",
            timeout: 15000
        });
        await loginButton.click();
        await loginModalHeading.waitFor({
            state: "visible",
            timeout: 15000
        });
        console.log("Login modal opened from the home page.");
    }

    async openLoginPage() {
        await this.page.goto(`${config.baseUrl}/login?ret=%2F`);
        await this.page.waitForLoadState("domcontentloaded");
    }

    async enterInvalidPhoneNumber(phoneNumber) {
        const phoneInput = this.page.locator('input[type="number"]').first();
        await phoneInput.waitFor({
            state: "visible",
            timeout: 15000
        });
        await phoneInput.fill(phoneNumber);

        const continueButton = this.page.getByRole(
            "button",
            { name: "Continue", exact: true }
        );
        if (await continueButton.isEnabled()) {
            await continueButton.click();
        }
    }

    async verifyInvalidPhoneNumberMessage() {
        const phoneError = this.page.getByText(
            "Invalid email id / mobile number",
            { exact: true }
        );
        await phoneError.waitFor({
            state: "visible",
            timeout: 10000
        });
    }

    async loginWithPhoneNumber() {
        const phoneNumber = process.env.FLIPKART_PHONE || userConfig.phoneNumber;

        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            throw new Error(
                "Set FLIPKART_PHONE to the 10-digit phone number used for Flipkart login."
            );
        }

        await this.openLoginModal();
        await this.submitPhoneNumberForOtp(phoneNumber);

        console.log("Waiting for the Flipkart SMS OTP screen. Enter the OTP in the browser.");

        console.log("Enter the SMS OTP in the browser. The automation will click Verify when all OTP digits are entered.");

        await this.page.waitForFunction(
            () => {
                const visibleInputs = Array.from(
                    document.querySelectorAll("input")
                ).filter(input =>
                    input.type !== "hidden" &&
                    input.name !== "q" &&
                    !input.placeholder.toLowerCase().includes("search") &&
                    input.getClientRects().length > 0
                );

                if (visibleInputs.length === 0) {
                    return false;
                }

                const expectedLength =
                    visibleInputs.length === 1 &&
                    visibleInputs[0].maxLength >= 4 &&
                    visibleInputs[0].maxLength <= 8
                        ? visibleInputs[0].maxLength
                        : visibleInputs.length > 1
                            ? visibleInputs.length
                            : 6;
                const otp = visibleInputs
                    .map(input => input.value)
                    .join("");

                return /^\d+$/.test(otp) &&
                    otp.length === expectedLength;
            },
            { timeout: 150000 }
        );

        await this.clickOtpVerify();

        const otpResult = await Promise.race([
            this.otpPrompt().waitFor({
                state: "hidden",
                timeout: 180000
            }).then(() => "success"),
            this.otpError().waitFor({
                state: "visible",
                timeout: 180000
            }).then(() => "error")
        ]);

        if (otpResult === "error") {
            const errorMessage = (await this.otpError().innerText()).trim();
            throw new Error(`Flipkart rejected the OTP: ${errorMessage}`);
        }

        console.log("Flipkart phone login completed.");
    }

    async submitIncorrectOtp() {
        const phoneNumber = process.env.FLIPKART_PHONE || userConfig.phoneNumber;

        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            throw new Error(
                "Set FLIPKART_PHONE to a valid 10-digit phone number for the OTP negative test."
            );
        }

        await this.startOtpVerification(phoneNumber);

        const otpInputs = this.page.locator(
            'input:visible:not([type="hidden"]):not([name="q"])'
        );
        await otpInputs.first().waitFor({
            state: "visible",
            timeout: 15000
        });

        const inputCount = await otpInputs.count();
        const invalidOtp = testData.invalidOtp;
        if (inputCount === 1) {
            const maxLength = Number(await otpInputs.first().getAttribute("maxlength"));
            const expectedLength = maxLength >= 4 && maxLength <= 8
                ? maxLength
                : invalidOtp.length;
            if (invalidOtp.length !== expectedLength) {
                throw new Error(
                    `Configured invalid OTP must contain ${expectedLength} digits.`
                );
            }
            await otpInputs.first().fill(invalidOtp);
        } else if (inputCount === invalidOtp.length) {
            for (let index = 0; index < inputCount; index += 1) {
                await otpInputs.nth(index).fill(invalidOtp[index]);
            }
        } else {
            throw new Error(
                `Expected one OTP field or ${invalidOtp.length} individual OTP fields, found ${inputCount}.`
            );
        }

        await this.clickOtpVerify();
    }

    async verifyInvalidOtpMessage() {
        await this.otpError().waitFor({
            state: "visible",
            timeout: 15000
        });
    }

    otpError() {
        return this.page.getByText(
            /(?:invalid|incorrect|wrong|expired|valid)\s*(?:otp|code)|(?:otp|code)\s*(?:is\s*)?(?:invalid|incorrect|wrong|expired|valid)/i
        ).first();
    }

    async startOtpVerification(phoneNumber) {
        await this.page.goto(`${config.baseUrl}/login?ret=%2F`);

        await this.submitPhoneNumberForOtp(phoneNumber);
    }

    otpPrompt() {
        return this.page.getByText(
            /please enter the verification code/i
        ).first();
    }

    async submitPhoneNumberForOtp(phoneNumber) {
        const phoneInput = this.page.locator('input[type="number"]').first();

        await phoneInput.waitFor({
            state: "visible",
            timeout: 15000
        });

        await phoneInput.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(1500);
        await phoneInput.pressSequentially(phoneNumber, {
            delay: 150
        });
        await this.page.waitForTimeout(2000);

        await this.page.getByRole(
            "button",
            { name: "Continue", exact: true }
        ).click();
        await this.otpPrompt().waitFor({
            state: "visible",
            timeout: 30000
        });
    }

    async clickOtpVerify() {
        const verifyButton = this.page.locator("button")
            .filter({ hasText: /^\s*verify\s*$/i })
            .last();

        if (await verifyButton.count() > 0) {
            await verifyButton.waitFor({
                state: "visible",
                timeout: 15000
            });
            await verifyButton.scrollIntoViewIfNeeded();

            try {
                await verifyButton.click({ timeout: 10000 });
            } catch (error) {
                console.warn(
                    `Normal Verify button click failed; retrying the visible button directly: ${error.message}`
                );
                await verifyButton.click({
                    force: true,
                    timeout: 10000
                });
            }

            console.log("Clicked the Verify button.");
            return;
        }

        const verifyText = this.page.getByText("Verify", { exact: true }).last();
        if (await verifyText.count() > 0) {
            await verifyText.waitFor({
                state: "visible",
                timeout: 15000
            });
            await verifyText.scrollIntoViewIfNeeded();
            await verifyText.click({
                force: true,
                timeout: 10000
            });
            console.log("Clicked the visible Verify control.");
            return;
        }

        throw new Error(
            "The OTP screen did not contain a Verify button or visible Verify control."
        );
    }


    async closeLoginPopup() {

        console.log("Checking for Login popup...");

        try {

            await this.loginPopupCloseButton.waitFor({
                state: "visible",
                timeout: 5000
            });

            console.log("Login popup detected.");

            await this.loginPopupCloseButton.click();

            console.log("Login popup closed.");

            await this.page.waitForTimeout(1000);

        } catch (error) {

            console.log("Login popup is not displayed.");
        }
    }
}


module.exports = LoginPage;
