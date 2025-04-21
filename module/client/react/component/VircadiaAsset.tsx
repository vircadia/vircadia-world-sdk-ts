import { useState, useEffect } from "react";
import { useVircadiaQuery } from "../hook/useVircadiaQuery";

export interface VircadiaAssetData {
    arrayBuffer: ArrayBuffer;
    base64: string;
    blob: Blob;
    type: string;
    url: string;
}

interface VircadiaAssetProps {
    assetFileName: string;
    onLoad?: (data: VircadiaAssetData) => void;
    onError?: (error: Error) => void;
}

export const VircadiaAsset: React.FC<VircadiaAssetProps> = ({
    assetFileName,
    onLoad,
    onError,
}) => {
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
                    asset__data__base64: string;
                    asset__type: string;
                }>({
                    query: `
                        SELECT asset__data__base64, asset__type
                        FROM entity.entity_assets
                        WHERE general__asset_file_name = $1
                    `,
                    parameters: [assetFileName],
                });

                if (!result.length) {
                    throw new Error(`Asset ${assetFileName} not found`);
                }

                // Convert base64 to various formats
                const base64 = result[0].asset__data__base64;
                const type = result[0].asset__type.toLowerCase();
                const binaryData = atob(base64);
                const arrayBuffer = new ArrayBuffer(binaryData.length);
                const view = new Uint8Array(arrayBuffer);

                for (let i = 0; i < binaryData.length; i++) {
                    view[i] = binaryData.charCodeAt(i);
                }

                const mimeType = getMimeType(type);
                const blob = new Blob([arrayBuffer], { type: mimeType });
                const url = URL.createObjectURL(blob);

                const data: VircadiaAssetData = {
                    arrayBuffer,
                    base64,
                    blob,
                    type,
                    url,
                };

                setAssetData(data);
                onLoad?.(data);
            } catch (err) {
                const error =
                    err instanceof Error
                        ? err
                        : new Error("Failed to load asset");
                setError(error);
                onError?.(error);
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
    }, [assetFileName, executeQuery, onLoad, onError, assetData]);

    return null;
};

const getMimeType = (extension: string): string => {
    const mimeTypes: Record<string, string> = {
        gltf: "model/gltf+json",
        glb: "model/gltf-binary",
        // Add more mime types as needed
    };
    return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
};
