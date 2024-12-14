import { z } from "zod";

const envSchema = z.object({
    VRCA_CLIENT_DEFAULT_TITLE: z
        .string()
        .default("Vircadia World Web Interface"),
    VRCA_CLIENT_DEFAULT_DESCRIPTION: z.string().default("..."),
    VRCA_CLIENT_DEFAULT_URL: z
        .string()
        .url()
        .default("https://app.vircadia.com"),
    VRCA_CLIENT_DEFAULT_OG_IMAGE: z.string().default("/brand/logo_icon.webp"),
    VRCA_CLIENT_DEFAULT_OG_TYPE: z.string().default("website"),
    VRCA_CLIENT_DEFAULT_FAVICON: z.string().default("/brand/favicon.svg"),

    VRCA_CLIENT_BASE_APP_URL: z
        .string()
        .url()
        .default("https://app.vircadia.com"),

    VRCA_CLIENT_DEFAULT_WORLD_SERVER_URL: z
        .string()
        .url()
        .default("localhost:8000"),
    VRCA_CLIENT_DEFAULT_WORLD_DATABASE_URL: z
        .string()
        .default("localhost:5432"),

    VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_USERNAME: z
        .string()
        .nullable()
        .default(null),
    VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_PASSWORD: z
        .string()
        .nullable()
        .default(null),
});

const env = envSchema.parse(import.meta.env);

export const VircadiaConfig_Client = {
    defaultTitle: env.VRCA_CLIENT_DEFAULT_TITLE,
    defaultDescription: env.VRCA_CLIENT_DEFAULT_DESCRIPTION,
    defaultUrl: env.VRCA_CLIENT_DEFAULT_URL,
    defaultFavicon: env.VRCA_CLIENT_DEFAULT_FAVICON,
    defaultOgImage: env.VRCA_CLIENT_DEFAULT_OG_IMAGE,
    defaultOgType: env.VRCA_CLIENT_DEFAULT_OG_TYPE,
    baseAppUrl: env.VRCA_CLIENT_BASE_APP_URL,
    defaultWorldServerUrl: env.VRCA_CLIENT_DEFAULT_WORLD_SERVER_URL,
    defaultWorldDatabaseUrl: env.VRCA_CLIENT_DEFAULT_WORLD_DATABASE_URL,
    defaultWorldAccountUsername: env.VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_USERNAME,
    defaultWorldAccountPassword: env.VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_PASSWORD,
};
