
const config = require("../config/config");
const userConfig = require("../test-data/userConfig.json");

class LoginPage {

    constructor(page) {

        this.page = page;

        // Login popup close button
        this.loginPopupCloseButton = page.locator(
            'button[aria-label="Close"]'
        ).first();
    }


    async navigate(url) {

        console.log(
            "Opening Flipkart home page..."
        );

        await this.page.goto(url);

        await this.page.waitForLoadState(
            "domcontentloaded"
        );

        await this.page.waitForTimeout(3000);

        console.log(
            "Flipkart home page opened."
        );

        // Close login popup if it appears
        await this.closeLoginPopup();
    }

    async loginWithPhoneNumber() {
        const phoneNumber =
            process.env.FLIPKART_PHONE || userConfig.phoneNumber;

        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            throw new Error(
                "Set FLIPKART_PHONE to the 10-digit phone number used for Flipkart login."
            );
        }

        await this.page.goto(
            `${config.baseUrl}/login?ret=%2F`
        );

        const phoneInput = this.page.locator(
            'input[type="number"]'
        ).first();

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

        console.log(
            "Waiting for the Flipkart SMS OTP screen. Enter the OTP in the browser."
        );

        await this.page.waitForFunction(
            () => location.pathname.includes("/login") &&
                new URLSearchParams(location.search).get("verificationType") === "otp",
            { timeout: 30000 }
        );

        console.log(
            "Enter the SMS OTP in the browser. The automation will click Verify when all OTP digits are entered."
        );

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

        const verifyButton = this.page.getByRole(
            "button",
            { name: /verify|continue|submit|confirm/i }
        ).last();

        if (await verifyButton.isVisible().catch(() => false)) {
            await verifyButton.click();
        } else {
            const verifyControl = this.page.getByText(
                /^(verify|continue|submit|confirm)$/i
            ).last();
            await verifyControl.waitFor({
                state: "visible",
                timeout: 15000
            });
            await verifyControl.click();
        }

        await this.page.waitForURL(
            url => !url.pathname.includes("/login"),
            { timeout: 180000 }
        );

        console.log(
            "Flipkart phone login completed."
        );
    }


    async closeLoginPopup() {

        console.log(
            "Checking for Login popup..."
        );

        try {

            await this.loginPopupCloseButton.waitFor({
                state: "visible",
                timeout: 5000
            });

            console.log(
                "Login popup detected."
            );

            await this.loginPopupCloseButton.click();

            console.log(
                "Login popup closed."
            );

            await this.page.waitForTimeout(1000);

        } catch (error) {

            console.log(
                "Login popup is not displayed."
            );
        }
    }
}


module.exports = LoginPage;
