import { ref, readonly, type Ref } from "vue"; // Removed watch
import type { VircadiaInstance } from "../provider/useVircadia";

export interface VircadiaAssetData {
    arrayBuffer: ArrayBuffer;
    blob: Blob;
    mimeType: string;
    blobUrl: string;
}

// Define options interface
export interface UseVircadiaAssetOptions {
    /** A Ref containing the name of the asset file to load. */
    fileName: Ref<string | null | undefined>; // Allow null/undefined
    instance: VircadiaInstance;
}

/**
 * Composable for manually loading Vircadia assets from the database.
 * Loading must be triggered explicitly by calling the returned `executeLoad` function.
 *
 * @param options - An object containing the configuration options.
 * @param options.fileName - A Ref containing the name of the asset file to load.
 * @returns Reactive refs for asset data, loading state, error state, the manual load function, and cleanup function.
 */
export function useVircadiaAsset(options: UseVircadiaAssetOptions) {
    // Destructure fileName from options
    const { fileName, instance } = options;

    const assetData = ref<VircadiaAssetData | null>(null);
    const loading = ref(false);
    const error = ref<Error | null>(null);

    const vircadia = instance;

    if (!vircadia) {
        throw new Error(
            `Vircadia instance (${options.instance}) not found. Ensure you are using this composable within a Vircadia context.`,
        );
    }

    // Function to clean up resources
    const cleanup = () => {
        if (assetData.value?.blobUrl) {
            console.log(`Manually revoking Object URL for: ${fileName.value}`);
            URL.revokeObjectURL(assetData.value.blobUrl);
            assetData.value = null;
        }
        // Reset states on cleanup
        loading.value = false;
        error.value = null;
    };

    // Renamed from loadAsset, now public and uses the fileName ref directly
    const executeLoad = async () => {
        const assetFileName = fileName.value; // Get current value from ref

        if (!assetFileName) {
            console.warn("executeLoad skipped: fileName is not provided.");
            // Clean up existing data if filename becomes null/undefined
            cleanup();
            return;
        }

        // Prevent load if already loading
        if (loading.value) {
            console.warn(
                `executeLoad skipped for ${assetFileName}: Load already in progress.`,
            );
            return;
        }

        loading.value = true;
        error.value = null;
        // Clean up previous URL if it exists before loading new one
        if (assetData.value?.blobUrl) {
            URL.revokeObjectURL(assetData.value.blobUrl);
            assetData.value = null; // Clear old data
        }

        try {
            console.log(`Starting to load asset: ${assetFileName}`);

            // Fetch from database
            const queryResult =
                await vircadia.client.Utilities.Connection.query<
                    {
                        asset__data__bytea:
                            | ArrayBufferLike
                            | {
                                  type: string;
                                  data: number[];
                              };
                        asset__mime_type: string;
                    }[]
                >({
                    query: `
            SELECT asset__data__bytea, asset__mime_type
            FROM entity.entity_assets
            WHERE general__asset_file_name = $1
          `,
                    parameters: [assetFileName],
                    timeoutMs: 100000, // Consider making this configurable
                });

            if (!queryResult.result || queryResult.result.length === 0) {
                throw new Error(`Asset ${assetFileName} not found`);
            }

            // Process bytea data
            const rawData = queryResult.result[0].asset__data__bytea;
            const mimeType = queryResult.result[0].asset__mime_type;

            // Handle bytea data in different formats
            let byteArray: Uint8Array; // Use Uint8Array directly
            if (
                rawData &&
                typeof rawData === "object" &&
                "data" in rawData &&
                // biome-ignore lint/suspicious/noExplicitAny: Trusting driver structure
                Array.isArray((rawData as any).data)
            ) {
                // biome-ignore lint/suspicious/noExplicitAny: Trusting driver structure
                byteArray = new Uint8Array((rawData as any).data);
            } else if (rawData instanceof ArrayBuffer) {
                // Handle direct ArrayBuffer case if the driver returns it
                byteArray = new Uint8Array(rawData);
            } else if (Array.isArray(rawData)) {
                // Handle simple array case (less likely but possible)
                byteArray = new Uint8Array(rawData);
            } else {
                throw new Error(
                    `Unexpected data format for asset ${assetFileName}`,
                );
            }

            // Using .slice() creates a copy of the data in a new Uint8Array,
            // and its buffer is guaranteed to be an ArrayBuffer.
            const arrayBuffer = byteArray.slice().buffer as ArrayBuffer;
            const blob = new Blob([byteArray], { type: mimeType });
            const url = URL.createObjectURL(blob);

            assetData.value = {
                arrayBuffer, // This is now guaranteed to be ArrayBuffer
                blob,
                mimeType: mimeType,
                blobUrl: url,
            };

            console.log(
                `Successfully loaded asset: ${assetFileName}, type: ${mimeType}, size: ${byteArray.length} bytes`,
            );
        } catch (err) {
            console.error(`Error loading asset ${assetFileName}:`, err);
            error.value =
                err instanceof Error ? err : new Error("Failed to load asset");
            // Ensure data is null on error and cleanup URL
            cleanup(); // Use cleanup to handle URL revocation and state reset
        } finally {
            // Only set loading to false if not cleaned up (which already sets it)
            if (loading.value) {
                loading.value = false;
            }
            console.log(`Finished loading attempt for asset: ${assetFileName}`);
        }
    };

    // Remove the watch that triggered automatic loading

    // No initial load is triggered automatically. User must call executeLoad().

    // Return readonly refs to prevent modification outside the composable
    // Plus the new executeLoad and cleanup functions
    return {
        assetData: readonly(assetData),
        loading: readonly(loading),
        error: readonly(error),
        executeLoad, // Expose manual load function
        cleanup, // Expose cleanup function for manual resource management
    };
}
