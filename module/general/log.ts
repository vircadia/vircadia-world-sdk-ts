import EC from "eight-colors";

// Detect if we're in a browser environment
const isBrowser =
    typeof window !== "undefined" && typeof window.document !== "undefined";

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

    if (data.type === "debug" && !data.debug) {
        return;
    }

    switch (data.type) {
        case "debug":
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
    const hasGroup = !!data.data;

    if (hasGroup) {
        console.group(formattedMessage);
    }

    // Single switch statement to handle all cases
    switch (data.type) {
        case "debug":
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
    if (hasGroup) {
        console.log("Additional data:", JSON.stringify(data.data, null, 2));
        console.groupEnd();
    }
}

function nodeLog(data: Parameters<typeof log>[0]): void {
    if (!data.type) {
        console.log(data.message);
        return;
    }

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
                console.debug(EC.blue(`${prefix}ℹ ${data.message}`));
            }
            break;
        case "info":
            if (!hasGroup) {
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
    if (hasGroup) {
        console.log("Additional data:", JSON.stringify(data.data, null, 2));
        console.groupEnd();
    }
}
