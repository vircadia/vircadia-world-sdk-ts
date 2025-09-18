import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from "idb";
import {
    Communication,
    type Entity,
} from "../../../../schema/src/vircadia.schema.general";
import { type Ref, ref, inject, readonly, computed } from "vue";
import { type useVircadia, useVircadiaInstance } from "../provider/useVircadia";

// Cache expiration duration in milliseconds (1 hour)
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit

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
 * Gets the total size of all assets in the cache
 * @returns The total size in bytes
 */
const getCacheSize = async (): Promise<number> => {
    try {
        const db = await getDB();
        const tx = db.transaction("assets", "readonly");
        const store = tx.objectStore("assets");

        let totalSize = 0;
        let cursor = await store.openCursor();

        while (cursor) {
            totalSize += cursor.value.data.byteLength;
            cursor = await cursor.continue();
        }

        await tx.done;
        return totalSize;
    } catch (err) {
        console.warn("Failed to get cache size:", err);
        return 0;
    }
};

/**
 * Makes room in the cache by removing oldest assets until target size is achieved
 * @param targetSize The amount of space needed in bytes
 */
const makeRoomInCache = async (targetSize: number): Promise<void> => {
    try {
        const db = await getDB();
        const tx = db.transaction("assets", "readwrite");
        const index = tx.store.index("by-timestamp");

        let cursor = await index.openCursor();
        let freedSpace = 0;
        const neededSpace = targetSize;

        // Sort by timestamp (oldest first) and delete until we have enough space
        while (cursor && freedSpace < neededSpace) {
            const entry = cursor.value;
            freedSpace += entry.data.byteLength;

            await cursor.delete();
            console.log(
                `Removed asset ${cursor.primaryKey} to free up space (${entry.data.byteLength} bytes)`,
            );

            cursor = await cursor.continue();
        }

        await tx.done;
        console.log(`Freed ${freedSpace} bytes from cache`);
    } catch (err) {
        console.warn("Failed to make room in cache:", err);
    }
};

/**
 * Composable for manually loading Vircadia assets from the database.
 * Loading must be triggered explicitly by calling the returned `executeLoad` function.
 *
 * @param options - An object containing the configuration options.
 * @param options.fileName - A Ref containing the name of the asset file to load.
 * @param options.instance - Optional Vircadia instance. If not provided, will try to inject from context.
 * @param options.debug - Enable detailed debug logging (default: false)
 * @returns Reactive refs for asset data, loading state, error state, the manual load function, and cleanup function.
 */
export function useAsset(options: {
    /** A Ref containing the name of the asset file to load. */
    fileName: Ref<string | null | undefined>; // Allow null/undefined
    /** The Vircadia instance to use. If not provided, will try to inject from component context. */
    instance?: ReturnType<typeof useVircadia>;
    /** Whether to use local storage caching (default: true) */
    useCache?: boolean;
    /** Enable detailed debug logging (default: false) */
    debug?: boolean;
}) {
    // Destructure fileName from options
    const { fileName, useCache = true, debug = false } = options;

    const assetData: Ref<VircadiaAssetData | null> = ref(null);
    const loading: Ref<boolean> = ref(false);
    const error: Ref<Error | null> = ref(null);

    // Add computed fileExtension based on mimeType
    const fileExtension = computed(() => {
        const mimeType = assetData.value?.mimeType;
        if (!mimeType) {
            return "";
        }
        switch (mimeType) {
            case "model/gltf-binary":
                return ".glb";
            case "model/gltf+json":
                return ".gltf";
            case "model/fbx":
                return ".fbx";
            default:
                return "";
        }
    });

    // Debug log helper function - only logs when debug is enabled
    const debugLog = (message: string, ...args: any[]) => {
        if (debug) {
            console.log(message, ...args);
        }
    };

    // Debug error helper - only logs errors when debug is enabled
    const debugError = (message: string, ...args: any[]) => {
        if (debug) {
            console.error(message, ...args);
        }
    };

    // Debug warn helper - only logs warnings when debug is enabled
    const debugWarn = (message: string, ...args: any[]) => {
        if (debug) {
            console.warn(message, ...args);
        }
    };

    // Use provided instance or try to inject from context
    const vircadia = options.instance || inject(useVircadiaInstance());

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
            debugLog("Getting asset hash for: ", assetFileName);

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

            debugLog(
                `Asset hash for ${assetFileName}: ${queryResult.result[0].hash}`,
            );

            return queryResult.result[0].hash;
        } catch (err) {
            debugError(`Error getting asset hash for ${assetFileName}:`, err);
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
            // Check if adding this asset would exceed the cache size limit
            const assetSize = data.byteLength;
            const currentCacheSize = await getCacheSize();

            // Log cache status
            debugLog(
                `Current cache size: ${(currentCacheSize / (1024 * 1024)).toFixed(2)}MB, Asset size: ${(assetSize / (1024 * 1024)).toFixed(2)}MB, Limit: ${(MAX_CACHE_SIZE_BYTES / (1024 * 1024)).toFixed(2)}MB`,
            );

            // Make room if we need to
            if (currentCacheSize + assetSize > MAX_CACHE_SIZE_BYTES) {
                debugLog(
                    "Cache size limit would be exceeded. Removing older assets...",
                );
                await makeRoomInCache(assetSize);
            }

            const db = await getDB();
            const cacheKey = `vircadia_asset_${fileName}`;
            const cacheEntry: CacheEntry = {
                data: data,
                mimeType: mimeType,
                hash: hash,
                timestamp: Date.now(),
            };

            await db.put("assets", cacheEntry, cacheKey);
            debugLog(
                `Cached asset ${fileName} in IndexedDB (${(assetSize / (1024 * 1024)).toFixed(2)}MB)`,
            );
        } catch (err) {
            debugWarn(`Failed to cache asset ${fileName} in IndexedDB:`, err);
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
                debugLog(`Cache for ${fileName} has expired`);
                await db.delete("assets", cacheKey);
                return null;
            }

            return cachedItem;
        } catch (err) {
            debugWarn(`Failed to retrieve cached asset ${fileName}:`, err);
            return null;
        }
    };

    // Function to clean up resources
    const cleanup = () => {
        if (assetData.value?.blobUrl) {
            debugLog(`Manually revoking Object URL for: ${fileName.value}`);
            URL.revokeObjectURL(assetData.value.blobUrl);
            assetData.value = null;
        }
        // Reset states on cleanup
        loading.value = false;
        error.value = null;
    };

    // Helper to convert Blob to a base64 data URL (bypasses XHR)
    const blobToDataUrl = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () =>
                reject(new Error("Failed to convert blob to data URL"));
            reader.readAsDataURL(blob);
        });
    };

    const executeLoad = async () => {
        debugLog("[executeLoad] Starting with fileName:", fileName.value);
        const assetFileName = fileName.value; // Get current value from ref

        if (!assetFileName) {
            console.warn("[executeLoad] skipped: fileName is not provided.");
            // Clean up existing data if filename becomes null/undefined
            debugLog("[executeLoad] Calling cleanup due to missing fileName");
            cleanup();
            return;
        }

        // Prevent load if already loading
        if (loading.value) {
            console.warn(
                `[executeLoad] Skipped for ${assetFileName}: Load already in progress.`,
            );
            return;
        }

        debugLog(
            `[executeLoad] Setting loading flag to true for ${assetFileName}`,
        );
        loading.value = true;
        error.value = null;

        // Clean up previous URL if it exists before loading new one
        if (assetData.value?.blobUrl) {
            debugLog(
                `[executeLoad] Revoking Object URL for: ${assetFileName} (${assetData.value.blobUrl})`,
            );
            try {
                URL.revokeObjectURL(assetData.value.blobUrl);
                debugLog("[executeLoad] Successfully revoked URL");
            } catch (urlErr) {
                debugError("[executeLoad] Error revoking URL:", urlErr);
            }
            assetData.value = null; // Clear old data
            debugLog("[executeLoad] Cleared old asset data");
        }

        try {
            debugLog(`[executeLoad] Starting to load asset: ${assetFileName}`);

            // First, check if we can use the cached version
            if (useCache) {
                debugLog(
                    "[executeLoad] Cache enabled, checking if we can use cached version",
                );

                // Get remote hash first to compare with cache
                debugLog(
                    `[executeLoad] Getting remote hash for ${assetFileName}`,
                );
                const remoteHash = await getAssetHash(assetFileName);
                debugLog("[executeLoad] Remote hash result:", remoteHash);

                if (remoteHash) {
                    debugLog(
                        `[executeLoad] Attempting to get from cache for ${assetFileName}`,
                    );
                    const cachedEntry = await getFromCache(assetFileName);
                    debugLog(
                        "[executeLoad] Cache result:",
                        cachedEntry ? "Found in cache" : "Not in cache",
                    );

                    // If we have valid cache and hash matches the remote one
                    if (cachedEntry && cachedEntry.hash === remoteHash) {
                        debugLog(
                            `[executeLoad] Using cached version of ${assetFileName} (hash match)`,
                        );

                        try {
                            debugLog(
                                "[executeLoad] Creating Uint8Array view from cached data",
                            );
                            const byteArray = new Uint8Array(cachedEntry.data);
                            debugLog(
                                "[executeLoad] Slicing byteArray to create fresh ArrayBuffer for cached data",
                            );
                            const arrayBuffer = byteArray.slice()
                                .buffer as ArrayBuffer;
                            debugLog(
                                "[executeLoad] Creating blob from Uint8Array view",
                            );
                            // Use raw ArrayBuffer for blob to satisfy BlobPart typing
                            const blob = new Blob([arrayBuffer], {
                                type: cachedEntry.mimeType,
                            });
                            let url: string;
                            if (cachedEntry.mimeType.startsWith("model/")) {
                                debugLog(
                                    "[executeLoad] Converting blob to data URL for model",
                                );
                                url = await blobToDataUrl(blob);
                            } else {
                                debugLog(
                                    "[executeLoad] Creating object URL for blob",
                                );
                                url = URL.createObjectURL(blob);
                            }
                            debugLog(`[executeLoad] Created URL: ${url}`);

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
                        } catch (cacheErr) {
                            debugError(
                                "[executeLoad] Error while processing cached data:",
                                cacheErr,
                            );
                            // Continue to fetch from server if cache processing fails
                        }
                    }

                    if (cachedEntry) {
                        debugLog(
                            `[executeLoad] Cache hash mismatch for ${assetFileName}, fetching from server. Cache hash: ${cachedEntry.hash}, Remote hash: ${remoteHash}`,
                        );
                    }
                }
            } else {
                debugLog(
                    "[executeLoad] Cache disabled, fetching from server directly",
                );
            }

            debugLog("[executeLoad] Fetching via REST asset endpoint");
            // REST layer now includes sessionId from shared config automatically
            const response = await vircadia.client.Utilities.REST.assetGetByKey(
                {
                    key: assetFileName,
                },
            );
            if (!response.ok) {
                throw new Error(`Asset fetch failed: HTTP ${response.status}`);
            }
            const mimeType =
                response.headers.get("Content-Type") ||
                "application/octet-stream";
            const arrayBuffer = await response.arrayBuffer();
            debugLog("[executeLoad] Received bytes:", arrayBuffer.byteLength);

            debugLog("[executeLoad] Asset mime type:", mimeType);

            const blob = new Blob([arrayBuffer], { type: mimeType });
            let url: string;
            if (mimeType.startsWith("model/")) {
                debugLog("[executeLoad] Converting blob to data URL for model");
                url = await blobToDataUrl(blob);
            } else {
                debugLog("[executeLoad] Creating object URL");
                url = URL.createObjectURL(blob);
            }
            debugLog(`[executeLoad] Created URL: ${url}`);

            // Get the hash of the asset data
            debugLog("[executeLoad] Getting asset hash again for caching");
            const hash = await getAssetHash(assetFileName);
            debugLog("[executeLoad] Got hash for caching:", hash);

            // Cache the asset for future use
            if (hash) {
                debugLog(`[executeLoad] Saving to cache with hash: ${hash}`);
                try {
                    await saveToCache(
                        assetFileName,
                        arrayBuffer,
                        mimeType,
                        hash,
                    );
                    debugLog("[executeLoad] Successfully saved to cache");
                } catch (cacheErr) {
                    debugWarn(
                        "[executeLoad] Failed to save to cache:",
                        cacheErr,
                    );
                    // Continue even if caching fails
                }
            }

            debugLog("[executeLoad] Setting assetData value");
            assetData.value = {
                arrayBuffer, // This is now guaranteed to be ArrayBuffer
                blob,
                mimeType: mimeType,
                blobUrl: url,
                hash, // Add the hash to the asset data
                fromCache: false,
            };

            console.log(
                `Successfully loaded asset: ${assetFileName}, type: ${mimeType}, size: ${arrayBuffer.byteLength} bytes${hash ? `, hash: ${hash}` : ""}`,
            );
        } catch (err) {
            console.error(`Error loading asset ${assetFileName}:`, err);
            debugError("[executeLoad] Error details:", {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
            });

            error.value =
                err instanceof Error ? err : new Error("Failed to load asset");

            debugLog("[executeLoad] Set error value and calling cleanup");
            // Ensure data is null on error and cleanup URL
            cleanup(); // Use cleanup to handle URL revocation and state reset
        } finally {
            // Only set loading to false if not cleaned up (which already sets it)
            if (loading.value) {
                debugLog(
                    "[executeLoad] Setting loading flag to false in finally block",
                );
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
        fileExtension: readonly(fileExtension),
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
