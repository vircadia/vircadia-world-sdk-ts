import {
    ref,
    getCurrentInstance,
    onUnmounted,
    type Ref,
    type InjectionKey,
} from "vue";

import {
    ClientCore,
    type WsConnectionCoreInfo,
} from "../../core/vircadia.client.browser.core.old";

/**
 * Creates a Vircadia client instance with Vue reactivity.
 * This function creates a completely independent instance without any global state.
 *
 * @param options Configuration options for the Vircadia client
 * @returns Vircadia client instance and connection info
 */
export function useVircadia(data: {
    config: ConstructorParameters<typeof ClientCore>[0];
}): {
    client: ClientCore;
    connectionInfo: Ref<WsConnectionCoreInfo>;
    dispose: () => void;
} {
    const { config } = data;

    // Initialize client with provided config
    const client = new ClientCore(config);

    // Create reactive connection info
    const connectionInfo = ref<WsConnectionCoreInfo>(
        client.Utilities.Connection.getConnectionInfo(),
    );

    // Update connection status when it changes
    const updateConnectionStatus = () => {
        connectionInfo.value = client.Utilities.Connection.getConnectionInfo();
    };

    // Listen for status changes
    client.Utilities.Connection.addEventListener(
        "statusChange",
        updateConnectionStatus,
    );

    // Create a dispose function
    const dispose = () => {
        client.Utilities.Connection.removeEventListener(
            "statusChange",
            updateConnectionStatus,
        );

        // Ensure disconnection happens before disposal if connected
        if (connectionInfo.value.isConnected) {
            client.Utilities.Connection.disconnect();
        }

        client.dispose();
    };

    // Only register cleanup on component unmount if in a component context
    const instance = getCurrentInstance();
    if (instance) {
        onUnmounted(dispose);
    }

    // Return the client and connection info
    return {
        client,
        connectionInfo,
        dispose,
    };
}

export const DEFAULT_VIRCADIA_INSTANCE_KEY = "vircadiaWorld";

export function useVircadiaInstance(
    name?: string,
): InjectionKey<ReturnType<typeof useVircadia>> {
    const instanceKey = name || DEFAULT_VIRCADIA_INSTANCE_KEY;
    return instanceKey as string & InjectionKey<ReturnType<typeof useVircadia>>;
}
