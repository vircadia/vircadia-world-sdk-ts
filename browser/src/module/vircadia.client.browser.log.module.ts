export function BrowserLogModule(data: {
    message: string;
    type?: "info" | "success" | "error" | "warning" | "warn" | "debug";
    debug?: boolean;
    suppress?: boolean;
    prefix?: string;
    error?: Error | unknown;
    data?: Record<string, unknown>;
}): void {
    if (data.suppress) return;

    const prefix = data.prefix ? `[${data.prefix}] ` : "";
    let icon = "";
    let style = "";

    if (data.type === "debug" && !data.debug) {
        return;
    }

    switch (data.type) {
        case "debug":
            icon = "🔍 ";
            style = "color: #4a9eff";
            break;
        case "info":
            icon = "ℹ️ ";
            style = "color: #4a9eff";
            break;
        case "success":
            icon = "✅ ";
            style = "color: #2ecc71";
            break;
        case "error":
            icon = "❌ ";
            style = "color: #e74c3c";
            break;
        case "warn":
        case "warning":
            icon = "⚠️ ";
            style = "color: #f1c40f";
            break;
        default:
            icon = "📝 ";
            style = "color: inherit";
    }

    const formattedMessage = `${icon}${prefix}${data.message}`;
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
