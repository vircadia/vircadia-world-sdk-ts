import { ref, readonly, type Ref, inject } from "vue"; // Removed watch
import {
    type I_VircadiaInstance_Vue,
    getVircadiaInstanceKey_Vue,
} from "../provider/useVircadia";
import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Entity } from "../../../schema/vircadia.schema.general";

// Cache expiration duration in milliseconds (1 hour)
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;

// Define DB schema for TypeScript support
interface AssetDBSchema extends DBSchema {
    assets: {
        key: string;
        value: {
            data: ArrayBuffer;
            mimeType: string;
            hash: string;
            timestamp: number;
        };
        indexes: { "by-timestamp": number };
    };
}

// Cache entry interface with timestamp for expiration checking
interface CacheEntry {
    data: ArrayBuffer;
    mimeType: string;
    hash: string;
    timestamp: number;
}

interface VircadiaAssetData {
    arrayBuffer: ArrayBuffer;
    blob: Blob;
    mimeType: string;
    blobUrl: string;
    hash?: string | null; // Allow null to fix type error
    fromCache?: boolean; // Flag to indicate if the data came from cache
}

// Define options interface
export interface UseVircadiaAssetOptions {
    /** A Ref containing the name of the asset file to load. */
    fileName: Ref<string | null | undefined>; // Allow null/undefined
    /** The Vircadia instance to use. If not provided, will try to inject from component context. */
    instance?: I_VircadiaInstance_Vue;
    /** Whether to use local storage caching (default: true) */
    useCache?: boolean;
}

// Create and get the database instance
const getDB = async () => {
    return openDB<AssetDBSchema>("vircadia-assets", 1, {
        upgrade(db: IDBPDatabase<AssetDBSchema>) {
            const store = db.createObjectStore("assets");
            // Create an index by timestamp for easy cleanup of old assets
            store.createIndex("by-timestamp", "timestamp");
        },
    });
};

/**
 * Composable for manually loading Vircadia assets from the database.
 * Loading must be triggered explicitly by calling the returned `executeLoad` function.
 *
 * @param options - An object containing the configuration options.
 * @param options.fileName - A Ref containing the name of the asset file to load.
 * @param options.instance - Optional Vircadia instance. If not provided, will try to inject from context.
 * @returns Reactive refs for asset data, loading state, error state, the manual load function, and cleanup function.
 */
export function useVircadiaAsset(options: UseVircadiaAssetOptions) {
    // Destructure fileName from options
    const { fileName, useCache = true } = options;

    const assetData = ref<VircadiaAssetData | null>(null);
    const loading = ref(false);
    const error = ref<Error | null>(null);

    // Use provided instance or try to inject from context
    const vircadia = options.instance || inject(getVircadiaInstanceKey_Vue());

    if (!vircadia) {
        throw new Error(
            "Vircadia instance not found. Either provide an instance in options or ensure this composable is used within a component with a provided Vircadia instance.",
        );
    }

    /**
     * Fetches the SHA-256 hash of the asset data using the database's digest function
     * @param assetFileName - The name of the asset to get the hash for
     * @returns A promise that resolves to the hash string, or null if not found
     */
    const getAssetHash = async (
        assetFileName: string,
    ): Promise<string | null> => {
        if (!assetFileName) return null;

        try {
            const queryResult =
                await vircadia.client.Utilities.Connection.query<
                    { hash: string }[]
                >({
                    query: `
                SELECT encode(digest(asset__data__bytea, 'sha256'), 'hex') as hash
                FROM entity.entity_assets
                WHERE general__asset_file_name = $1
                `,
                    parameters: [assetFileName],
                    timeoutMs: 5000,
                });

            if (!queryResult.result || queryResult.result.length === 0) {
                return null;
            }

            return queryResult.result[0].hash;
        } catch (err) {
            console.error(
                `Error getting asset hash for ${assetFileName}:`,
                err,
            );
            return null;
        }
    };

    /**
     * Saves asset data to IndexedDB with expiration
     */
    const saveToCache = async (
        fileName: string,
        data: ArrayBuffer,
        mimeType: string,
        hash: string | null,
    ) => {
        if (!useCache || !hash) return;

        try {
            const db = await getDB();
            const cacheKey = `vircadia_asset_${fileName}`;
            const cacheEntry: CacheEntry = {
                data: data,
                mimeType: mimeType,
                hash: hash,
                timestamp: Date.now(),
            };

            await db.put("assets", cacheEntry, cacheKey);
            console.log(`Cached asset ${fileName} in IndexedDB`);
        } catch (err) {
            console.warn(
                `Failed to cache asset ${fileName} in IndexedDB:`,
                err,
            );
            // If IndexedDB has issues, just continue without caching
        }
    };

    /**
     * Retrieves asset data from IndexedDB if available and not expired
     * @returns Retrieved cache entry or null if not found/expired
     */
    const getFromCache = async (
        fileName: string,
    ): Promise<CacheEntry | null> => {
        if (!useCache) return null;

        try {
            const cacheKey = `vircadia_asset_${fileName}`;
            const db = await getDB();
            const cachedItem = await db.get("assets", cacheKey);

            if (!cachedItem) return null;

            const now = Date.now();

            // Check if cache is expired
            if (now - cachedItem.timestamp > CACHE_EXPIRATION_MS) {
                console.log(`Cache for ${fileName} has expired`);
                await db.delete("assets", cacheKey);
                return null;
            }

            return cachedItem;
        } catch (err) {
            console.warn(`Failed to retrieve cached asset ${fileName}:`, err);
            return null;
        }
    };

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

            // First, check if we can use the cached version
            if (useCache) {
                // Get remote hash first to compare with cache
                const remoteHash = await getAssetHash(assetFileName);

                if (remoteHash) {
                    const cachedEntry = await getFromCache(assetFileName);

                    // If we have valid cache and hash matches the remote one
                    if (cachedEntry && cachedEntry.hash === remoteHash) {
                        console.log(
                            `Using cached version of ${assetFileName} (hash match)`,
                        );

                        const arrayBuffer = cachedEntry.data;
                        const blob = new Blob([arrayBuffer], {
                            type: cachedEntry.mimeType,
                        });
                        const url = URL.createObjectURL(blob);

                        assetData.value = {
                            arrayBuffer,
                            blob,
                            mimeType: cachedEntry.mimeType,
                            blobUrl: url,
                            hash: remoteHash,
                            fromCache: true,
                        };

                        loading.value = false;
                        console.log(
                            `Successfully loaded cached asset: ${assetFileName}`,
                        );
                        return;
                    }

                    if (cachedEntry) {
                        console.log(
                            `Cache hash mismatch for ${assetFileName}, fetching from server`,
                        );
                    }
                }
            }

            // Fetch from database
            const queryResult =
                await vircadia.client.Utilities.Connection.query<
                    (Pick<Entity.Asset.I_Asset, "asset__mime_type"> & {
                        asset__data__bytea:
                            | ArrayBufferLike
                            | {
                                  type: string;
                                  data: number[];
                              };
                    })[]
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

            if (!queryResult.result[0].asset__data__bytea) {
                throw new Error(`Asset ${assetFileName} has no data`);
            }

            // Process bytea data
            const rawData = queryResult.result[0].asset__data__bytea;

            if (!queryResult.result[0].asset__mime_type) {
                throw new Error(`Asset ${assetFileName} has no mime type`);
            }

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

            // Get the hash of the asset data
            const hash = await getAssetHash(assetFileName);

            // Cache the asset for future use
            if (hash) {
                await saveToCache(assetFileName, arrayBuffer, mimeType, hash);
            }

            assetData.value = {
                arrayBuffer, // This is now guaranteed to be ArrayBuffer
                blob,
                mimeType: mimeType,
                blobUrl: url,
                hash, // Add the hash to the asset data
                fromCache: false,
            };

            console.log(
                `Successfully loaded asset: ${assetFileName}, type: ${mimeType}, size: ${byteArray.length} bytes${hash ? `, hash: ${hash}` : ""}`,
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

    /**
     * Clears the cache entry for a specific asset
     */
    const clearCache = async (assetFileName?: string) => {
        if (!useCache) return;

        try {
            const db = await getDB();

            if (assetFileName) {
                // Clear specific asset
                const cacheKey = `vircadia_asset_${assetFileName}`;
                await db.delete("assets", cacheKey);
                console.log(`Cleared cache for asset: ${assetFileName}`);
            } else if (fileName.value) {
                // Clear current asset
                const cacheKey = `vircadia_asset_${fileName.value}`;
                await db.delete("assets", cacheKey);
                console.log(`Cleared cache for asset: ${fileName.value}`);
            }
        } catch (err) {
            console.warn("Failed to clear cache:", err);
        }
    };

    /**
     * Clears all cached assets from IndexedDB
     */
    const clearAllCache = async () => {
        if (!useCache) return;

        try {
            // Quick way to clear all data - delete and recreate the database
            await deleteDB("vircadia-assets");
            await getDB(); // Recreate the database
            console.log("Cleared all assets from cache");
        } catch (err) {
            console.warn("Failed to clear all cache:", err);
        }
    };

    /**
     * Clears expired assets from IndexedDB to free up space
     */
    const clearExpiredCache = async () => {
        if (!useCache) return;

        try {
            const db = await getDB();
            const now = Date.now();
            const tx = db.transaction("assets", "readwrite");
            const index = tx.store.index("by-timestamp");

            // Get all assets by timestamp
            let cursor = await index.openCursor();
            let count = 0;

            while (cursor) {
                if (now - cursor.value.timestamp > CACHE_EXPIRATION_MS) {
                    await cursor.delete();
                    count++;
                }
                cursor = await cursor.continue();
            }

            await tx.done;
            console.log(`Cleared ${count} expired assets from cache`);
        } catch (err) {
            console.warn("Failed to clear expired cache:", err);
        }
    };

    // Return readonly refs to prevent modification outside the composable
    // Plus the new executeLoad and cleanup functions
    return {
        assetData: readonly(assetData),
        loading: readonly(loading),
        error: readonly(error),
        executeLoad, // Expose manual load function
        cleanup, // Expose cleanup function for manual resource management
        getAssetHash, // Expose the hash function for direct use
        clearCache, // Expose function to clear cache for current/specific asset
        clearAllCache, // Expose function to clear all cached assets
        clearExpiredCache, // Expose function to clear expired assets
    };
}
