/// <reference types="bun-types" />
/// <reference types="node" />

interface ImportMeta {
    readonly env: Record<string, string | boolean | number | undefined>;
}

// Make sure process is available
declare const process: {
    env: Record<string, string | undefined>;
};
