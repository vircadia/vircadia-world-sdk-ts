import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook that converts a byte array from a database query into an Object URL.
 * Handles different potential formats of the byte array data and cleans up the URL when component unmounts.
 *
 * @param byteArray - The byte array data from the query (could be array or object with data property)
 * @param mimeType - The MIME type to use for the Blob
 * @returns Object with the URL, error, and loading state
 */
export const useVircadiaByteArrayToObjectUrl = (
    byteArray: number[] | { type: string; data: number[] } | null | undefined,
    mimeType: string,
) => {
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Parse the byte array and create a URL
    const processBytes = useCallback(() => {
        setLoading(true);
        setError(null);

        try {
            // Clear any previous URL
            if (url) {
                URL.revokeObjectURL(url);
                setUrl(null);
            }

            // Return early if no byte array data
            if (!byteArray) {
                setLoading(false);
                return;
            }

            // Handle different formats of byte array data
            let normalizedArray: number[];
            if (Array.isArray(byteArray)) {
                normalizedArray = byteArray;
            } else if (
                byteArray &&
                typeof byteArray === "object" &&
                "data" in byteArray &&
                Array.isArray(byteArray.data)
            ) {
                normalizedArray = byteArray.data;
            } else {
                throw new Error("Invalid byte array format");
            }

            // Create a Uint8Array from the normalized byte array
            const uint8Array = new Uint8Array(normalizedArray);

            // Create a Blob with the specified MIME type
            const blob = new Blob([uint8Array], { type: mimeType });

            // Create an Object URL from the Blob
            const objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err
                    : new Error("Failed to process byte array"),
            );
        } finally {
            setLoading(false);
        }
    }, [byteArray, mimeType, url]);

    // Process the byte array when it changes
    useEffect(() => {
        processBytes();
    }, [processBytes]);

    // Clean up the URL when the component unmounts
    useEffect(() => {
        return () => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [url]);

    return { url, error, loading };
};
