import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
    useMemo,
} from "react";
import type {
    VircadiaClientCore,
    VircadiaClientCoreConfig,
} from "../core/vircadia.client.core";
import { VircadiaClientCore as VircadiaClientCoreImpl } from "../core/vircadia.client.core";

// Define types for our context
interface VircadiaContextType {
    client: VircadiaClientCore | null;
    connectionStatus:
        | "connected"
        | "connecting"
        | "reconnecting"
        | "disconnected";
    error: Error | null;
    isReady: boolean;
    connect: () => Promise<boolean>;
    disconnect: () => void;
    query: <T = unknown>(options: {
        query: string;
        parameters?: unknown[];
        timeoutMs?: number;
    }) => Promise<T[]>;
}

// Create context with default values
export const VircadiaContext = createContext<VircadiaContextType>({
    client: null,
    connectionStatus: "disconnected",
    error: null,
    isReady: false,
    connect: async () => false,
    disconnect: () => {},
    query: async () => [],
});

// Provider props
interface VircadiaProviderProps {
    children: ReactNode;
    config: VircadiaClientCoreConfig;
    autoConnect?: boolean;
}

export const VircadiaProvider = ({
    children,
    config,
    autoConnect = true,
}: VircadiaProviderProps) => {
    const [client, setClient] = useState<VircadiaClientCore | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<
        "connected" | "connecting" | "reconnecting" | "disconnected"
    >("disconnected");
    const [error, setError] = useState<Error | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Connect function - defined before it's used in useEffect
    const connect = useCallback(async () => {
        if (!client) return false;

        try {
            setConnectionStatus("connecting");
            setError(null);

            const success = await client.Utilities.Connection.connect();
            if (success) {
                setConnectionStatus("connected");
            } else {
                setConnectionStatus("disconnected");
            }

            return success;
        } catch (err) {
            setError(
                err instanceof Error ? err : new Error("Connection failed"),
            );
            setConnectionStatus("disconnected");
            return false;
        }
    }, [client]);

    // Initialize client
    useEffect(() => {
        try {
            const newClient = new VircadiaClientCoreImpl(config);
            setClient(newClient);
            setIsReady(true);

            return () => {
                newClient.dispose();
            };
        } catch (err) {
            setError(
                err instanceof Error
                    ? err
                    : new Error("Failed to initialize Vircadia client"),
            );
            setIsReady(false);
        }
    }, [config]);

    // Monitor connection status changes directly
    useEffect(() => {
        if (!client) return;

        // Define event listeners for connection status changes
        const handleStatusChange = () => {
            if (client.Utilities.Connection.isConnected()) {
                setConnectionStatus("connected");
            } else if (client.Utilities.Connection.isConnecting()) {
                setConnectionStatus("connecting");
            } else if (client.Utilities.Connection.isReconnecting()) {
                setConnectionStatus("reconnecting");
            } else {
                setConnectionStatus("disconnected");
            }
        };

        // Check if event listener methods exist (TypeScript safety)
        const connection = client.Utilities.Connection;
        if (
            "addEventListener" in connection &&
            "removeEventListener" in connection
        ) {
            // Subscribe to connection events
            connection.addEventListener("statusChange", handleStatusChange);

            // Initial status check
            handleStatusChange();

            return () => {
                connection.removeEventListener(
                    "statusChange",
                    handleStatusChange,
                );
            };
        }

        // Fallback to initial status check only
        handleStatusChange();
    }, [client]);

    // Auto-connect if enabled
    useEffect(() => {
        if (autoConnect && client && isReady) {
            connect();
        }
    }, [client, isReady, autoConnect, connect]);

    // Disconnect function
    const disconnect = useCallback(() => {
        if (!client) return;

        client.Utilities.Connection.disconnect();
        setConnectionStatus("disconnected");
    }, [client]);

    // Create context value
    const contextValue = useMemo(
        () => ({
            client,
            connectionStatus,
            error,
            isReady,
            connect,
            disconnect,
            query: async <T = unknown>(options: {
                query: string;
                parameters?: unknown[];
                timeoutMs?: number;
            }): Promise<T[]> => {
                if (!client || !client.Utilities.Connection.isConnected()) {
                    throw new Error("Not connected to server");
                }

                try {
                    const response =
                        await client.Utilities.Connection.query<T[]>(options);
                    return response.result || [];
                } catch (err) {
                    throw err instanceof Error
                        ? err
                        : new Error("Query failed");
                }
            },
        }),
        [client, connectionStatus, error, isReady, connect, disconnect],
    );

    return (
        <VircadiaContext.Provider value={contextValue}>
            {children}
        </VircadiaContext.Provider>
    );
};
