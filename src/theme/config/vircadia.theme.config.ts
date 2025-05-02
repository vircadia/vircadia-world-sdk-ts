import { z } from "zod";

// Brand configuration schema
const brandEnvSchema = z.object({
	// Primary colors
	VRCA_BRAND_COLOR_PRIMARY: z.string().default("#466BFF"),
	VRCA_BRAND_COLOR_PRIMARY_DARK: z.string().default("#2952FF"),
	VRCA_BRAND_COLOR_PRIMARY_DARKER: z.string().default("#1B46FF"),
	VRCA_BRAND_COLOR_PRIMARY_DARKEST: z.string().default("#0030E9"),
	VRCA_BRAND_COLOR_PRIMARY_LIGHT: z.string().default("#6384FF"),
	VRCA_BRAND_COLOR_PRIMARY_LIGHTER: z.string().default("#7190FF"),
	VRCA_BRAND_COLOR_PRIMARY_LIGHTEST: z.string().default("#9BB1FF"),

	// Secondary colors
	VRCA_BRAND_COLOR_SECONDARY: z.string().default("#01BDFF"),
	VRCA_BRAND_COLOR_SECONDARY_DARK: z.string().default("#00AAE6"),
	VRCA_BRAND_COLOR_SECONDARY_DARKER: z.string().default("#00A0D9"),
	VRCA_BRAND_COLOR_SECONDARY_DARKEST: z.string().default("#0084B3"),
	VRCA_BRAND_COLOR_SECONDARY_LIGHT: z.string().default("#1DC5FF"),
	VRCA_BRAND_COLOR_SECONDARY_LIGHTER: z.string().default("#29C8FF"),
	VRCA_BRAND_COLOR_SECONDARY_LIGHTEST: z.string().default("#52D2FF"),

	// Accent color
	VRCA_BRAND_COLOR_ACCENT: z.string().default("#8C1AFF"),
	VRCA_BRAND_COLOR_ACCENT_DARK: z.string().default("#7A00FC"),
	VRCA_BRAND_COLOR_ACCENT_DARKER: z.string().default("#7000E8"),
	VRCA_BRAND_COLOR_ACCENT_DARKEST: z.string().default("#5C00BF"),
	VRCA_BRAND_COLOR_ACCENT_LIGHT: z.string().default("#9C3AFF"),
	VRCA_BRAND_COLOR_ACCENT_LIGHTER: z.string().default("#A84DFF"),
	VRCA_BRAND_COLOR_ACCENT_LIGHTEST: z.string().default("#C178FF"),

	// Text colors
	VRCA_BRAND_TEXT_LIGHT: z.string().default("#FFFFFF"),
	VRCA_BRAND_TEXT_DARK: z.string().default("#1A1A1A"),

	// Background colors
	VRCA_BRAND_BACKGROUND_LIGHT: z.string().default("#F8F9FA"),
	VRCA_BRAND_BACKGROUND_DARK: z.string().default("#121212"),

	// Brand assets
	VRCA_BRAND_LOGO_PATH: z.string().default("/brand/logo.svg"),
	VRCA_BRAND_ICON_PATH: z.string().default("/brand/icon.svg"),
	VRCA_BRAND_FAVICON_PATH: z.string().default("/brand/favicon.svg"),
});

// Define env record type based on our schema
type BrandEnvRecord = z.infer<typeof brandEnvSchema>;

// Parse brand environment variables
export const VircadiaConfig_BRAND = brandEnvSchema.parse(
	// Fix TypeScript error with appropriate typing
	(typeof import.meta !== "undefined"
		? (import.meta as { env?: Record<string, unknown> }).env
		: undefined) ?? process.env,
);

// Export color palette as CSS variables format for easy integration
export const getBrandCSSVariables = (): Record<string, string> => {
	return {
		// Primary colors
		"--vircadia-color-primary": VircadiaConfig_BRAND.VRCA_BRAND_COLOR_PRIMARY,
		"--vircadia-color-primary-dark":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_PRIMARY_DARK,
		"--vircadia-color-primary-darker":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_PRIMARY_DARKER,
		"--vircadia-color-primary-darkest":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_PRIMARY_DARKEST,
		"--vircadia-color-primary-light":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_PRIMARY_LIGHT,
		"--vircadia-color-primary-lighter":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_PRIMARY_LIGHTER,
		"--vircadia-color-primary-lightest":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_PRIMARY_LIGHTEST,

		// Secondary colors
		"--vircadia-color-secondary":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_SECONDARY,
		"--vircadia-color-secondary-dark":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_SECONDARY_DARK,
		"--vircadia-color-secondary-darker":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_SECONDARY_DARKER,
		"--vircadia-color-secondary-darkest":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_SECONDARY_DARKEST,
		"--vircadia-color-secondary-light":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_SECONDARY_LIGHT,
		"--vircadia-color-secondary-lighter":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_SECONDARY_LIGHTER,
		"--vircadia-color-secondary-lightest":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_SECONDARY_LIGHTEST,

		// Accent colors
		"--vircadia-color-accent": VircadiaConfig_BRAND.VRCA_BRAND_COLOR_ACCENT,
		"--vircadia-color-accent-dark":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_ACCENT_DARK,
		"--vircadia-color-accent-darker":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_ACCENT_DARKER,
		"--vircadia-color-accent-darkest":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_ACCENT_DARKEST,
		"--vircadia-color-accent-light":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_ACCENT_LIGHT,
		"--vircadia-color-accent-lighter":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_ACCENT_LIGHTER,
		"--vircadia-color-accent-lightest":
			VircadiaConfig_BRAND.VRCA_BRAND_COLOR_ACCENT_LIGHTEST,

		// Text colors
		"--vircadia-text-light": VircadiaConfig_BRAND.VRCA_BRAND_TEXT_LIGHT,
		"--vircadia-text-dark": VircadiaConfig_BRAND.VRCA_BRAND_TEXT_DARK,

		// Background colors
		"--vircadia-background-light":
			VircadiaConfig_BRAND.VRCA_BRAND_BACKGROUND_LIGHT,
		"--vircadia-background-dark":
			VircadiaConfig_BRAND.VRCA_BRAND_BACKGROUND_DARK,
	};
};
