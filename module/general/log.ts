import EC from "eight-colors";

export function log(data: {
	message: string;
	type?: "info" | "success" | "error" | "warning" | "warn" | "debug";
	debug?: boolean;
	prefix?: string;
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
				EC.blue(`${data.prefix ? `[${data.prefix}]: ` : ""} ℹ ${data.message}`),
			);
			break;
		case "success":
			console.log(
				EC.green(
					`${data.prefix ? `[${data.prefix}]: ` : ""} ✔ ${data.message}`,
				),
			);
			break;
		case "error":
			console.error(
				EC.red(`${data.prefix ? `[${data.prefix}]: ` : ""} ✖ ${data.message}`),
			);
			break;
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
