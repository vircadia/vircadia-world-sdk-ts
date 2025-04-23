import { inject, ref, readonly, computed } from "vue";
import type { Ref, ComputedRef, DeepReadonly } from "vue";
import type {
    VircadiaClientCore,
    ConnectionStats,
    ConnectionStatus,
} from "../../../core/vircadia.client.core";
import type { Communication } from "../../../../../schema/schema.general";
// Import the shared keys
import {
    VIRCADIA_CLIENT_KEY,
    VIRCADIA_CONNECTION_STATUS_KEY,
} from "./injectionKeys";

/**
 * Vircadia client composable for Vue applications.
 * Must be used within a component that is a descendant of VircadiaProvider.
 * Provides reactive state and methods to interact with the Vircadia connection.
 */
export function useVircadia() {
    // Inject using the imported keys
    const client = inject(VIRCADIA_CLIENT_KEY);
    const connectionStatus = inject(VIRCADIA_CONNECTION_STATUS_KEY);

    // Ensure the composable is used within the provider context
    if (!client || !connectionStatus) {
        throw new Error(
            "useVircadia() must be used within a <VircadiaProvider> component.",
        );
    }

    // Local ref to track connection errors specifically from the connect() method call
    const connectionError = ref<Error | null>(null);

    // Derived computed properties for easier consumption
    const isConnected = computed(() => connectionStatus.value.isConnected);
    const isConnecting = computed(() => connectionStatus.value.isConnecting);
    const status = computed(() => connectionStatus.value.status);

    // Wrap the connect method to handle errors locally
    const connect = async (): Promise<boolean> => {
        connectionError.value = null; // Reset error before attempting connection
        try {
            // Call the actual connect method on the client's connection manager
            return await client.Utilities.Connection.connect();
        } catch (error) {
            // Store the error locally for components to react to
            connectionError.value =
                error instanceof Error ? error : new Error(String(error));
            console.error("useVircadia connect error:", error); // Log error
            return false; // Indicate connection failure
        }
    };

    // Directly return the proxied methods and reactive state
    return {
        // Reactive state
        status,
        isConnected,
        isConnecting,
        connectionStatus: readonly(connectionStatus), // Provide read-only access to the full status object
        connectionError: readonly(connectionError), // Provide read-only access to the connection error

        // Methods
        connect, // Use the wrapped connect method
        disconnect: client.Utilities.Connection.disconnect, // Proxy directly
        query: client.Utilities.Connection.query, // Proxy directly

        // Raw client access
        client, // Provide access to the underlying client if needed
    };
}
