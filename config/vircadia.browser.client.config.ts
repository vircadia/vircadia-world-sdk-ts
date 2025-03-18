import { z } from "zod";

// Browser Client environment schema
const browserClientEnvSchema = z.object({
    VRCA_CLIENT_CONTAINER_NAME: z.string().default("vircadia_world_client"),
    VRCA_CLIENT_TEST_TOKEN: z.string().nullable().default(null),

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

    VRCA_CLIENT_WEB_BABYLON_JS_PRODUCTION_HOST_CONTAINER_EXPOSE: z
        .string()
        .default("127.0.0.1"),
    VRCA_CLIENT_WEB_BABYLON_JS_PRODUCTION_PORT_CONTAINER_EXPOSE: z.coerce
        .number()
        .default(3025),
    VRCA_CLIENT_WEB_BABYLON_JS_PRODUCTION_PORT_CONTAINER_INTERNAL: z.coerce
        .number()
        .default(3025),

    VRCA_CLIENT_WEB_BABYLON_JS_DEV_HOST_CONTAINER_EXPOSE: z
        .string()
        .default("127.0.0.1"),
    VRCA_CLIENT_WEB_BABYLON_JS_DEV_PORT_CONTAINER_INTERNAL: z.coerce
        .number()
        .default(3066),
    VRCA_CLIENT_WEB_BABYLON_JS_DEV_PORT_CONTAINER_EXPOSE: z.coerce
        .number()
        .default(3066),

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

    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_SERVER_URI: z
        .string()
        .default("localhost:3020"),
    VRCA_CLIENT_WEB_BABYLON_JS_DEFAULT_WORLD_SERVER_URI_USING_SSL: z
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
