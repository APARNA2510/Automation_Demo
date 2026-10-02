const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

class ShoppingCartRunner {
    static run() {
        let userConfig;
        try {
            userConfig = JSON.parse(
                fs.readFileSync(
                    path.join(__dirname, "test-data", "userConfig.json"),
                    "utf8"
                )
            );
        } catch (error) {
            console.error(
                "Could not read test-data/userConfig.json:",
                error.message
            );
            process.exitCode = 1;
            return;
        }

        const phoneNumber = userConfig.phoneNumber;

        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            console.error(
                "Set phoneNumber to a valid 10-digit phone number in test-data/userConfig.json."
            );
            process.exitCode = 1;
            return;
        }

        process.env.FLIPKART_PHONE = phoneNumber;

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
