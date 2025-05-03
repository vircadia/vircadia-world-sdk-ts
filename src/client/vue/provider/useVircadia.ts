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
} from "../../core/vircadia.client.common.core";

/**
 * Options for creating a Vircadia instance
 */
export interface I_VircadiaOptions_Vue {
    /**
     * Configuration for the Vircadia client
     */
    config: VircadiaClientCoreConfig;
}

/**
 * Return type for the Vue_useVircadia function
 */
export interface I_VircadiaInstance_Vue {
    client: VircadiaClientCore;
    connectionInfo: Ref<ConnectionInfo>;
    dispose: () => void;
}

export const VUE_DEFAULT_INSTANCE_KEY = "vircadiaWorld";

export function getVircadiaInstanceKey_Vue(
    name?: string,
): InjectionKey<I_VircadiaInstance_Vue> {
    const instanceKey = name || VUE_DEFAULT_INSTANCE_KEY;
    return instanceKey as string & InjectionKey<I_VircadiaInstance_Vue>;
}

/**
 * Creates a Vircadia client instance with Vue reactivity.
 * This function creates a completely independent instance without any global state.
 *
 * @param options Configuration options for the Vircadia client
 * @returns Vircadia client instance and connection info
 */
export function useVircadia_Vue(
    options: I_VircadiaOptions_Vue,
): I_VircadiaInstance_Vue {
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
