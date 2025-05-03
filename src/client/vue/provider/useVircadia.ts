import {
    ref,
    getCurrentInstance,
    onUnmounted,
    type Ref,
    type InjectionKey,
} from "vue";

import {
    VircadiaClientCore,
    type VircadiaClientCoreConfig,
    type ConnectionInfo,
} from "../../../core/browser/vircadia.client.browser.core";

/**
 * Options for creating a Vircadia instance
 */
export interface I_Vue_VircadiaOptions {
    /**
     * Configuration for the Vircadia client
     */
    config: VircadiaClientCoreConfig;
}

/**
 * Return type for the useVircadia function
 */
export interface I_Vue_VircadiaInstance {
    client: VircadiaClientCore;
    connectionInfo: Ref<ConnectionInfo>;
    dispose: () => void;
}

/**
 * Creates a Vircadia client instance with Vue reactivity.
 * This function creates a completely independent instance without any global state.
 *
 * @param options Configuration options for the Vircadia client
 * @returns Vircadia client instance and connection info
 */
export function useVircadia(
    options: I_Vue_VircadiaOptions,
): I_Vue_VircadiaInstance {
    const { config } = options;

    // Initialize client with provided config
    const client = new VircadiaClientCore(config);

    // Create reactive connection info
    const connectionInfo = ref<ConnectionInfo>(
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

export function getInstanceKey(
    name: string,
): InjectionKey<I_Vue_VircadiaInstance> {
    return name as string & InjectionKey<I_Vue_VircadiaInstance>;
}
