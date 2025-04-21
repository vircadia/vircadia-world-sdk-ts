import { useState, useEffect } from "react";
import { useVircadiaQuery } from "./useVircadiaQuery";

export interface VircadiaAssetData {
    arrayBuffer: ArrayBuffer;
    blob: Blob;
    type: string;
    url: string;
}

export function useVircadiaAsset(assetFileName: string) {
    const [assetData, setAssetData] = useState<VircadiaAssetData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const executeQuery = useVircadiaQuery();

    useEffect(() => {
        const loadAsset = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch from database
                const result = await executeQuery<{
                    asset__data__bytea: any;
                    asset__mime_type: string;
                }>({
                    query: `
                        SELECT asset__data__bytea, asset__mime_type
                        FROM entity.entity_assets
                        WHERE general__asset_file_name = $1
                    `,
                    parameters: [assetFileName],
                });

                if (!result.length) {
                    throw new Error(`Asset ${assetFileName} not found`);
                }

                // Process bytea data
                const rawData = result[0].asset__data__bytea;
                const mimeType = result[0].asset__mime_type;

                // Handle bytea data in different formats
                let byteArray: number[] = [];
                if (
                    rawData &&
                    typeof rawData === "object" &&
                    "data" in rawData &&
                    Array.isArray((rawData as unknown as any).data)
                ) {
                    byteArray = (rawData as unknown as any).data;
                } else if (Array.isArray(rawData)) {
                    byteArray = rawData;
                }

                // Convert to array buffer and blob
                const uint8Array = new Uint8Array(byteArray);
                const arrayBuffer = uint8Array.buffer;
                const blob = new Blob([uint8Array], { type: mimeType });
                const url = URL.createObjectURL(blob);

                const data: VircadiaAssetData = {
                    arrayBuffer,
                    blob,
                    type: mimeType,
                    url,
                };

                setAssetData(data);
            } catch (err) {
                const error =
                    err instanceof Error
                        ? err
                        : new Error("Failed to load asset");
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        loadAsset();

        return () => {
            if (assetData?.url) {
                URL.revokeObjectURL(assetData.url);
            }
        };
    }, [assetFileName, executeQuery]);

    return { assetData, error, loading };
}
