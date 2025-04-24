<template>
    <slot></slot>
</template>

<script setup lang="ts">
import { provide, onUnmounted, ref, readonly, defineExpose } from "vue"; // Import defineExpose
import {
    VircadiaClientCore,
    type VircadiaClientCoreConfig,
    type ConnectionInfo,
} from "../../../core/vircadia.client.core";
// Import the shared keys
import {
    VIRCADIA_CLIENT_KEY,
    VIRCADIA_CONNECTION_INFO_KEY,
} from "./injectionKeys";

// Props definition
const props = defineProps<{
    config: VircadiaClientCoreConfig;
}>();

// Initialize client with provided config
const client = new VircadiaClientCore(props.config);
const connectionInfo = ref<ConnectionInfo>(
    client.Utilities.Connection.getConnectionInfo(), // Initialize with current status
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

// Provide the client and connection status to child components using imported keys
provide(VIRCADIA_CLIENT_KEY, client);
provide(VIRCADIA_CONNECTION_INFO_KEY, readonly(connectionInfo));

// Clean up resources when component is unmounted
onUnmounted(() => {
    client.Utilities.Connection.removeEventListener(
        "statusChange",
        updateConnectionStatus,
    );
    // Ensure disconnection happens before disposal if connected
    if (connectionInfo.value.isConnected) {
        client.Utilities.Connection.disconnect();
    }
    client.dispose();
});

// Expose the client instance and connectionInfo ref to the parent
defineExpose({
    client,
    connectionInfo: readonly(connectionInfo), // Expose the readonly ref
});
</script>