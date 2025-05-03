import EC from "eight-colors";

export function log(data: {
    message: string;
    type?: "info" | "success" | "error" | "warning" | "warn" | "debug";
    debug?: boolean;
    suppress?: boolean;
    prefix?: string;
    error?: Error | unknown;
    data?: Record<string, unknown>;
}): void {
    if (data.suppress) return;

    // Early return for debug messages when debug is false
    if (data.type === "debug" && !data.debug) {
        return;
    }

    const prefix = data.prefix ? `[${data.prefix}]: ` : "";
    const hasGroup = !!data.data;

    if (hasGroup) {
        console.group(`${prefix}${data.message}`);
    }

    switch (data.type) {
        case "debug":
            if (!hasGroup) {
                console.debug(EC.blue(`ℹ ${prefix}${data.message}`));
            }
            break;
        case "info":
            if (!hasGroup) {
                console.info(EC.blue(`ℹ ${prefix}${data.message}`));
            }
            break;
        case "success":
            console.log(EC.green(`✔ ${prefix}${data.message}`));
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
            console.error(EC.red(`✖ ${prefix}${errorMessage}`));
            break;
        }
        case "warn":
        case "warning":
            console.warn(EC.yellow(`⚠ ${prefix}${data.message}`));
            break;
        default:
            console.info(EC.white(`? ${prefix}${data.message}`));
    }

    // Show additional data if present and close group
    if (hasGroup) {
        console.log("Additional data:", JSON.stringify(data.data, null, 2));
        console.groupEnd();
    }
}
