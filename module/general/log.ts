import EC from "eight-colors";

export function log(data: {
    message: string;
    type?: "info" | "success" | "error" | "warning" | "warn" | "debug";
    debug?: boolean;
    prefix?: string;
    error?: Error | unknown;
}): void {
    if (!data.type) {
        console.log(data.message);
        return;
    }

    switch (data.type) {
        case "debug":
            if (data.debug) {
                console.debug(
                    EC.blue(
                        `${data.prefix ? `[${data.prefix}]: ` : ""} ℹ ${data.message}`,
                    ),
                );
            }
            break;
        case "info":
            console.info(
                EC.blue(
                    `${data.prefix ? `[${data.prefix}]: ` : ""} ℹ ${data.message}`,
                ),
            );
            break;
        case "success":
            console.log(
                EC.green(
                    `${data.prefix ? `[${data.prefix}]: ` : ""} ✔ ${data.message}`,
                ),
            );
            break;
        case "error": {
            let errorMessage = data.message;
            if (data.error) {
                if (data.error instanceof Error) {
                    errorMessage += `\nError: ${data.error.message}`;
                    if (data.error.stack) {
                        errorMessage += `\nStack: ${data.error.stack}`;
                    }
                } else {
                    errorMessage += `\nError Details: ${JSON.stringify(data.error, null, 2)}`;
                }
            }
            console.error(
                EC.red(
                    `${data.prefix ? `[${data.prefix}]: ` : ""} ✖ ${errorMessage}`,
                ),
            );
            break;
        }
        case "warn":
        case "warning":
            console.warn(
                EC.yellow(
                    `${data.prefix ? `[${data.prefix}]: ` : ""} ⚠ ${data.message}`,
                ),
            );
            break;
        default:
            console.info(
                EC.white(
                    `${data.prefix ? `[${data.prefix}]: ` : ""} ? ${data.message}`,
                ),
            );
            break;
    }
}
