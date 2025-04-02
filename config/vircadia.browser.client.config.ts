import { z } from "zod";

// Browser Client environment schema
const browserClientEnvSchema = z.object({
    VRCA_CLIENT_CONTAINER_NAME: z.string().default("vircadia_world_client"),
    VRCA_CLIENT_WEB_BABYLON_JS_DEBUG: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),
    VRCA_CLIENT_WEB_BABYLON_JS_SUPPRESS: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),

    // Production Web Babylon JS Client
    VRCA_CLIENT_WEB_BABYLON_JS_PRODUCTION_CONTAINER_NAME: z
        .string()
        .default("vircadia_world_client_web_babylon_js_prod"),
    VRCA_CLIENT_WEB_BABYLON_JS_PRODUCTION_HOST_CONTAINER_BIND_EXTERNAL: z
        .string()
        .default("0.0.0.0"),
    VRCA_CLIENT_WEB_BABYLON_JS_PRODUCTION_PORT_CONTAINER_BIND_EXTERNAL: z.coerce
        .number()
        .default(3025),
    VRCA_CLIENT_WEB_BABYLON_JS_PRODUCTION_PORT_CONTAINER_BIND_INTERNAL: z.coerce
        .number()
        .default(3025),

    // Development Web Babylon JS Client
    VRCA_CLIENT_WEB_BABYLON_JS_DEV_CONTAINER_NAME: z
        .string()
        .default("vircadia_world_client_web_babylon_js_dev"),
    VRCA_CLIENT_WEB_BABYLON_JS_DEV_HOST: z.string().default("0.0.0.0"),
    VRCA_CLIENT_WEB_BABYLON_JS_DEV_PORT: z.coerce.number().default(3066),
    VRCA_CLIENT_WEB_BABYLON_JS_DEBUG_SESSION_TOKEN: z.string().default(""),

    VRCA_CLIENT_WEB_BABYLON_JS_META_TITLE_BASE: z.string().default("Vircadia"),
    VRCA_CLIENT_WEB_BABYLON_JS_META_DESCRIPTION: z.string().default("..."),
    VRCA_CLIENT_WEB_BABYLON_JS_META_OG_IMAGE: z
        .string()
        .default("/brand/logo_icon.webp"),
    VRCA_CLIENT_WEB_BABYLON_JS_META_OG_TYPE: z.string().default("website"),
    VRCA_CLIENT_WEB_BABYLON_JS_META_FAVICON: z
        .string()
        .default("/brand/favicon.svg"),

    VRCA_CLIENT_WEB_BABYLON_JS_APP_URL: z
        .string()
        .url()
        .default("https://app.vircadia.com"),

    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_URI: z
        .string()
        .default("localhost:3020"),
    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_API_URI_USING_SSL: z
        .union([
            z.boolean(),
            z
                .string()
                .transform(
                    (val) => val === "1" || val.toLowerCase() === "true",
                ),
        ])
        .default(false),
});

// Parse client environment variables
export const VircadiaConfig_BROWSER_CLIENT = browserClientEnvSchema.parse(
    import.meta.env,
);
