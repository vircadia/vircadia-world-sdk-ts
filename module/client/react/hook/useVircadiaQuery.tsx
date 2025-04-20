import { useCallback } from "react";
import { useVircadia } from "./useVircadia";

export const useVircadiaQuery = () => {
    const { query, connectionStatus } = useVircadia();

    const executeQuery = useCallback(
        async <T = unknown>(options: {
            query: string;
            parameters?: unknown[];
            timeoutMs?: number;
        }): Promise<T[]> => {
            if (connectionStatus !== "connected") {
                throw new Error("Not connected to server");
            }
            return query<T>(options);
        },
        [query, connectionStatus],
    );

    return executeQuery;
};
