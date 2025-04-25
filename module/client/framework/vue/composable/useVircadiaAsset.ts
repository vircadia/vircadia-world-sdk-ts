import { ref, watch, readonly, type Ref } from "vue";
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
    fileName: Ref<string>;
    instance: VircadiaInstance;
}

/**
 * Composable for reactively loading Vircadia assets from the database.
 *
 * @param options - An object containing the configuration options.
 * @param options.fileName - A Ref containing the name of the asset file to load.
 * @returns Reactive refs for asset data, loading state, error state, and cleanup function.
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
    };

    const loadAsset = async (options: { assetFileName: string }) => {
        const { assetFileName } = options;

        if (!assetFileName) {
            assetData.value = null;
            loading.value = false;
            error.value = null;
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

            if (!queryResult.result[0]) {
                throw new Error(`Asset ${assetFileName} not found`);
            }

            // Process bytea data
            const rawData = queryResult.result[0].asset__data__bytea;
            const mimeType = queryResult.result[0].asset__mime_type;

            // Handle bytea data in different formats
            let byteArray: number[] = [];
            if (
                rawData &&
                typeof rawData === "object" &&
                "data" in rawData &&
                // biome-ignore lint/suspicious/noExplicitAny: ...
                Array.isArray((rawData as unknown as any).data)
            ) {
                // biome-ignore lint/suspicious/noExplicitAny: ...
                byteArray = (rawData as unknown as any).data;
            } else if (rawData instanceof ArrayBuffer) {
                // Handle direct ArrayBuffer case if the driver returns it
                byteArray = Array.from(new Uint8Array(rawData));
            } else if (Array.isArray(rawData)) {
                // Handle simple array case
                byteArray = rawData;
            } else {
                throw new Error(
                    `Unexpected data format for asset ${assetFileName}`,
                );
            }

            // Convert to array buffer and blob
            const uint8Array = new Uint8Array(byteArray);
            const arrayBuffer = uint8Array.buffer;
            const blob = new Blob([uint8Array], { type: mimeType });
            const url = URL.createObjectURL(blob);

            assetData.value = {
                arrayBuffer,
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
            // Ensure data is null on error
            if (assetData.value?.blobUrl) {
                URL.revokeObjectURL(assetData.value.blobUrl);
            }
            assetData.value = null;
        } finally {
            loading.value = false;
            console.log(`Finished loading attempt for asset: ${assetFileName}`);
        }
    };

    // Watch the fileName ref (already destructured) and trigger loading
    watch(
        fileName,
        (newFileName) => {
            loadAsset({ assetFileName: newFileName });
        },
        { immediate: true }, // Load immediately when the composable is used
    );

    // Return readonly refs to prevent modification outside the composable
    // Plus the new cleanup function
    return {
        assetData: readonly(assetData),
        loading: readonly(loading),
        error: readonly(error),
        cleanup, // Expose cleanup function for manual resource management
    };
}
