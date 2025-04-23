<template>
    <slot></slot>
</template>

<script setup lang="ts">
import { provide, onUnmounted, ref, readonly } from "vue";
import {
    VircadiaClientCore,
    type VircadiaClientCoreConfig,
    type ConnectionStats,
} from "../../../core/vircadia.client.core";
// Import the shared keys
import {
    VIRCADIA_CLIENT_KEY,
    VIRCADIA_CONNECTION_STATUS_KEY,
} from "./injectionKeys";

// Props definition
const props = defineProps<{
    config: VircadiaClientCoreConfig;
}>();

// Initialize client with provided config
const client = new VircadiaClientCore(props.config);
const connectionStatus = ref<ConnectionStats>({
    status: "disconnected",
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
});

// Update connection status when it changes
const updateConnectionStatus = () => {
    connectionStatus.value = client.Utilities.Connection.getConnectionStatus();
};

// Listen for status changes
client.Utilities.Connection.addEventListener(
    "statusChange",
    updateConnectionStatus,
);

// Provide the client and connection status to child components using imported keys
provide(VIRCADIA_CLIENT_KEY, client);
provide(VIRCADIA_CONNECTION_STATUS_KEY, readonly(connectionStatus)); // Keep readonly for safety if desired

// Clean up resources when component is unmounted
onUnmounted(() => {
    client.Utilities.Connection.removeEventListener(
        "statusChange",
        updateConnectionStatus,
    );
    // Ensure disconnection happens before disposal if connected
    if (connectionStatus.value.isConnected) {
        client.Utilities.Connection.disconnect();
    }
    client.dispose();
});
</script>