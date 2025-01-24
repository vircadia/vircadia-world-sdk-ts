import EC from "eight-colors";

// Detect if we're in a browser environment
const isBrowser =
    typeof window !== "undefined" && typeof window.document !== "undefined";

export function log(data: {
    message: string;
    type?: "info" | "success" | "error" | "warning" | "warn" | "debug";
    debug?: boolean;
    prefix?: string;
    error?: Error | unknown;
    data?: Record<string, unknown>;
}): void {
    if (isBrowser) {
        browserLog(data);
    } else {
        nodeLog(data);
    }
}

function browserLog(data: Parameters<typeof log>[0]): void {
    const prefix = data.prefix ? `[${data.prefix}] ` : "";
    let icon = "";
    let style = "";

    switch (data.type) {
        case "debug":
            if (!data.debug) return;
            icon = "🔍";
            style = "color: #4a9eff";
            break;
        case "info":
            icon = "ℹ️";
            style = "color: #4a9eff";
            break;
        case "success":
            icon = "✅";
            style = "color: #2ecc71";
            break;
        case "error":
            icon = "❌";
            style = "color: #e74c3c";
            break;
        case "warn":
        case "warning":
            icon = "⚠️";
            style = "color: #f1c40f";
            break;
        default:
            icon = "📝";
            style = "color: inherit";
    }

    const formattedMessage = `${prefix}${icon} ${data.message}`;

    if (data.data) {
        console.group(formattedMessage);
    }

    // Single switch statement to handle all cases
    switch (data.type) {
        case "debug":
            if (!data.debug) return;
            console.debug(`%c${formattedMessage}`, style);
            break;
        case "error":
            console.error(`%c${formattedMessage}`, style);
            if (data.error) {
                if (data.error instanceof Error) {
                    console.error(`%c${data.error.message}`, style);
                    if (data.error.stack) {
                        console.error(
                            `%c${data.error.stack}`,
                            "color: #95a5a6",
                        );
                    }
                } else {
                    console.error(
                        `%c${JSON.stringify(data.error, null, 2)}`,
                        style,
                    );
                }
            }
            break;
        case "warn":
        case "warning":
            console.warn(`%c${formattedMessage}`, style);
            break;
        default:
            console.log(`%c${formattedMessage}`, style);
    }

    // Show additional data if present and close group
    if (data.data) {
        console.log("Additional data:", JSON.stringify(data.data, null, 2));
        console.groupEnd();
    }
}

function nodeLog(data: Parameters<typeof log>[0]): void {
    if (!data.type) {
        console.log(data.message);
        return;
    }

    const prefix = data.prefix ? `[${data.prefix}]: ` : "";

    // If there's additional data, start a group with the actual message
    if (data.data) {
        console.group(`${prefix}${data.message}`);
    }

    switch (data.type) {
        case "debug":
            if (!data.debug) return;
            // Only show the message without grouping if we're not in a group
            if (!data.data) {
                console.debug(EC.blue(`${prefix}ℹ ${data.message}`));
            }
            break;
        case "info":
            if (!data.data) {
                console.info(EC.blue(`${prefix}ℹ ${data.message}`));
            }
            break;
        case "success":
            console.log(EC.green(`${prefix}✔ ${data.message}`));
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
            console.error(EC.red(`${prefix}✖ ${errorMessage}`));
            break;
        }
        case "warn":
        case "warning":
            console.warn(EC.yellow(`${prefix}⚠ ${data.message}`));
            break;
        default:
            console.info(EC.white(`${prefix}? ${data.message}`));
    }

    // Show additional data if present and close group
    if (data.data) {
        console.log("Additional data:", JSON.stringify(data.data, null, 2));
        console.groupEnd();
    }
}
