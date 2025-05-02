// Re-export modules individually to enable tree-shaking
// Each module should be a separate import/export to allow bundlers to trace dependencies

// Import version from package.json
import { version } from "../package.json";

// Core modules
export * from "./core/world";
export * from "./core/avatar";
export * from "./core/entity";

// Services
export * from "./services/auth";
export * from "./services/messaging";
export * from "./services/storage";

// Utilities
export * from "./utils/math";
export * from "./utils/logger";

// Types
export * from "./types";

// Version information
export const VERSION = version;

// This allows consumers to do selective imports like:
// import { Avatar, createWorld } from 'vircadia-world-sdk-ts'
// And tree-shaking will only include what's actually used
