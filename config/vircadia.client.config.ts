import { z } from "zod";

const envSchema = z.object({
    VRCA_CLIENT_DEFAULT_TITLE: z.string().default("Vircadia World Web Interface"),
    VRCA_CLIENT_DEFAULT_DESCRIPTION: z.string().default("..."),
    VRCA_CLIENT_DEFAULT_URL: z.string().url().default("https://app.vircadia.com"),
    VRCA_CLIENT_DEFAULT_OG_IMAGE: z.string().default("/brand/logo_icon.webp"),
    VRCA_CLIENT_DEFAULT_OG_TYPE: z.string().default("website"),
    VRCA_CLIENT_DEFAULT_FAVICON: z.string().default("/brand/favicon.svg"),

    VRCA_CLIENT_BASE_APP_URL: z.string().url().default("https://app.vircadia.com"),

    VRCA_CLIENT_DEFAULT_WORLD_SUPABASE_URL: z
        .string()
        .url()
        .default("https://api-antares.vircadia.com"),
    VRCA_CLIENT_DEFAULT_WORLD_SUPABASE_ANON_KEY: z
        .string()
        .default(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
        ),

    VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_USERNAME: z
        .string()
        .nullable()
        .default("admin@changeme.com"),
    VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_PASSWORD: z
        .string()
        .nullable()
        .default("CHANGE_ME!"),
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
    defaultWorldSupabaseUrl: env.VRCA_CLIENT_DEFAULT_WORLD_SUPABASE_URL,
    defaultWorldSupabaseAnonKey: env.VRCA_CLIENT_DEFAULT_WORLD_SUPABASE_ANON_KEY,
    defaultWorldAccountUsername: env.VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_USERNAME,
    defaultWorldAccountPassword: env.VRCA_CLIENT_DEFAULT_WORLD_ACCOUNT_PASSWORD,
};
