const path = require("path");
const { spawn } = require("child_process");

class ShoppingCartRunner {
    static run() {
        const phoneVariables = [
            "FLIPKART_POSITIVE_PHONE",
            "FLIPKART_INVALID_OTP_PHONE"
        ];

        for (const variableName of phoneVariables) {
            if (process.env[variableName] === undefined) {
                continue;
            }

            const phoneNumber = process.env[variableName].trim();
            if (!/^\d{10}$/.test(phoneNumber)) {
                console.error(
                    `${variableName} must contain exactly 10 digits when provided.`
                );
                process.exitCode = 1;
                return;
            }

            process.env[variableName] = phoneNumber;
        }

        const cucumberCli = path.join(
            __dirname,
            "node_modules",
            "@cucumber",
            "cucumber",
            "bin",
            "cucumber.js"
        );
        const cucumber = spawn(
            process.execPath,
            [cucumberCli],
            {
                cwd: __dirname,
                env: process.env,
                stdio: "inherit"
            }
        );

        cucumber.on("error", error => {
            console.error("Could not start Cucumber:", error.message);
            process.exitCode = 1;
        });

        cucumber.on("exit", (code, signal) => {
            if (signal) {
                console.error(`Cucumber stopped by signal ${signal}.`);
                process.exitCode = 1;
                return;
            }

            process.exitCode = code ?? 1;
        });
    }
}

ShoppingCartRunner.run();
