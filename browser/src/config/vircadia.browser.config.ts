import { z } from "zod";

const BooleanStringSchema = z
    .union([
        z.boolean(),
        z.string().transform((val) => val === "1" || val.toLowerCase() === "true"),
    ])
    .default(false);

const BooleanStringTrueSchema = z
    .union([
        z.boolean(),
        z.string().transform((val) => val === "1" || val.toLowerCase() === "true"),
    ])
    .default(true);

// Parse client environment variables with runtime (localStorage) overrides
const baseEnv =
    (typeof import.meta !== "undefined"
        ? ((import.meta as { env?: Record<string, unknown> }).env ?? {})
        : // @ts-ignore
          process.env) ?? {};

// Allow overriding or disabling the debug auth token at runtime via localStorage
// Keys:
// - "VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN": string (empty string disables)
// - "VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN_PROVIDER": string
// - "VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN_DISABLED": "1" | "true" to force disable
const mergedEnv: Record<string, unknown> = { ...baseEnv };

try {
    if (typeof window !== "undefined" && window?.localStorage) {
        const disabledFlag = window.localStorage.getItem(
            "VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN_DISABLED",
        );
        const lsToken = window.localStorage.getItem(
            "VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN",
        );
        const lsProvider = window.localStorage.getItem(
            "VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN_PROVIDER",
        );

        // If explicitly disabled, ensure token is empty
        const isDisabled =
            disabledFlag === "1" || disabledFlag?.toLowerCase() === "true";
        if (isDisabled) {
            mergedEnv.VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN = "";
        }

        // If an override token is present in LS (including empty string), use it
        if (lsToken !== null) {
            mergedEnv.VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN = lsToken;
        }
        if (lsProvider !== null) {
            mergedEnv.VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN_PROVIDER =
                lsProvider;
        }
    }
} catch {
    // Ignore storage access errors (e.g., privacy modes)
}

const getEnv = (key: string) => mergedEnv[key];

// Web Babylon JS Client
const VRCA_CLIENT_WEB_BABYLON_JS_DEBUG = BooleanStringSchema.parse(
    getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEBUG"),
);
const VRCA_CLIENT_WEB_BABYLON_JS_SUPPRESS = BooleanStringSchema.parse(
    getEnv("VRCA_CLIENT_WEB_BABYLON_JS_SUPPRESS"),
);

const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_HOST = z
    .string()
    .default("antares.vircadia.com")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_HOST"));

const VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN = z
    .string()
    .default("")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN"));
const VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN_PROVIDER = z
    .string()
    .default("system")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN_PROVIDER"));

const VRCA_CLIENT_WEB_BABYLON_JS_AUTO_CONNECT = BooleanStringTrueSchema.parse(
    getEnv("VRCA_CLIENT_WEB_BABYLON_JS_AUTO_CONNECT"),
);

const VRCA_CLIENT_WEB_BABYLON_JS_META_TITLE_BASE = z
    .string()
    .default("Vircadia")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_META_TITLE_BASE"));
const VRCA_CLIENT_WEB_BABYLON_JS_META_DESCRIPTION = z
    .string()
    .default("...")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_META_DESCRIPTION"));
const VRCA_CLIENT_WEB_BABYLON_JS_META_OG_IMAGE = z
    .string()
    .default("/brand/logo_icon.webp")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_META_OG_IMAGE"));
const VRCA_CLIENT_WEB_BABYLON_JS_META_OG_TYPE = z
    .string()
    .default("website")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_META_OG_TYPE"));
const VRCA_CLIENT_WEB_BABYLON_JS_META_FAVICON = z
    .string()
    .default("/brand/favicon.svg")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_META_FAVICON"));

const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_WS_URI = z
    .string()
    .default(VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_HOST)
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_WS_URI"));
const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_WS_URI_USING_SSL =
    BooleanStringTrueSchema.parse(
        getEnv(
            "VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_WS_URI_USING_SSL",
        ),
    );

const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_AUTH_URI = z
    .string()
    .default(VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_HOST)
    .parse(
        getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_AUTH_URI"),
    );
const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_AUTH_URI_USING_SSL =
    BooleanStringTrueSchema.parse(
        getEnv(
            "VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_AUTH_URI_USING_SSL",
        ),
    );

const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_ASSET_URI = z
    .string()
    .default(VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_HOST)
    .parse(
        getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_ASSET_URI"),
    );
const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_ASSET_URI_USING_SSL =
    BooleanStringTrueSchema.parse(
        getEnv(
            "VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_ASSET_URI_USING_SSL",
        ),
    );

const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_INFERENCE_URI = z
    .string()
    .default(VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_HOST)
    .parse(
        getEnv(
            "VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_INFERENCE_URI",
        ),
    );
const VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_INFERENCE_URI_USING_SSL =
    BooleanStringTrueSchema.parse(
        getEnv(
            "VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_INFERENCE_URI_USING_SSL",
        ),
    );

const VRCA_CLIENT_WEB_BABYLON_JS_PROD_HOST = z
    .string()
    .default("0.0.0.0")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_PROD_HOST"));
const VRCA_CLIENT_WEB_BABYLON_JS_PROD_PORT = z.coerce
    .number()
    .default(3025)
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_PROD_PORT"));

// Development Web Babylon JS Client
const VRCA_CLIENT_WEB_BABYLON_JS_DEV_HOST = z
    .string()
    .default("0.0.0.0")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEV_HOST"));
const VRCA_CLIENT_WEB_BABYLON_JS_DEV_PORT = z.coerce
    .number()
    .default(3066)
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_DEV_PORT"));

// User components directory (relative to ./src/user)
// Example: "vircadia-world-seeds" will load from ./src/user/vircadia-world-seeds
const VRCA_CLIENT_WEB_BABYLON_JS_USER_COMPONENTS_PATH_RELATIVE = z
    .string()
    .default("")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_USER_COMPONENTS_PATH_RELATIVE"));

// User components directory (absolute path)
// Example: "/Users/me/my-seeds" will load from that directory
const VRCA_CLIENT_WEB_BABYLON_JS_USER_COMPONENTS_PATH_ABSOLUTE = z
    .string()
    .default("")
    .parse(getEnv("VRCA_CLIENT_WEB_BABYLON_JS_USER_COMPONENTS_PATH_ABSOLUTE"));

// Browser Client environment schema
export const clientBrowserConfiguration = {
    // Web Babylon JS Client
    VRCA_CLIENT_WEB_BABYLON_JS_DEBUG,
    VRCA_CLIENT_WEB_BABYLON_JS_SUPPRESS,
    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_HOST,
    VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN,
    VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN_PROVIDER,

    VRCA_CLIENT_WEB_BABYLON_JS_AUTO_CONNECT,

    VRCA_CLIENT_WEB_BABYLON_JS_META_TITLE_BASE,
    VRCA_CLIENT_WEB_BABYLON_JS_META_DESCRIPTION,
    VRCA_CLIENT_WEB_BABYLON_JS_META_OG_IMAGE,
    VRCA_CLIENT_WEB_BABYLON_JS_META_OG_TYPE,
    VRCA_CLIENT_WEB_BABYLON_JS_META_FAVICON,

    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_WS_URI,
    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_WS_URI_USING_SSL,

    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_AUTH_URI,
    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_AUTH_URI_USING_SSL,

    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_ASSET_URI,
    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_ASSET_URI_USING_SSL,

    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_INFERENCE_URI,
    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_REST_INFERENCE_URI_USING_SSL,

    VRCA_CLIENT_WEB_BABYLON_JS_PROD_HOST,
    VRCA_CLIENT_WEB_BABYLON_JS_PROD_PORT,

    // Development Web Babylon JS Client
    VRCA_CLIENT_WEB_BABYLON_JS_DEV_HOST,
    VRCA_CLIENT_WEB_BABYLON_JS_DEV_PORT,

    // User components directory (relative to ./src/user)
    // Example: "vircadia-world-seeds" will load from ./src/user/vircadia-world-seeds
    VRCA_CLIENT_WEB_BABYLON_JS_USER_COMPONENTS_PATH_RELATIVE,
    // User components directory (absolute path)
    // Example: "/Users/me/my-seeds" will load from that directory
    VRCA_CLIENT_WEB_BABYLON_JS_USER_COMPONENTS_PATH_ABSOLUTE,
};
