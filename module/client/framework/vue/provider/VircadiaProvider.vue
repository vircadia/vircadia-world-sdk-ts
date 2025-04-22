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

const VIRCADIA_CLIENT_KEY = Symbol("vircadiaClient");
const VIRCADIA_CONNECTION_STATUS_KEY = Symbol("vircadiaConnectionStatus");

// Props definition
const props = defineProps<{
    config: VircadiaClientCoreConfig;
    autoConnect?: boolean;
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

// Set up auto-connect if enabled
if (props.autoConnect) {
    client.Utilities.Connection.connect().catch((error) => {
        console.error("Failed to auto-connect to Vircadia server:", error);
    });
}

// Provide the client and connection status to child components
provide(VIRCADIA_CLIENT_KEY, client);
provide(VIRCADIA_CONNECTION_STATUS_KEY, readonly(connectionStatus));

// Clean up resources when component is unmounted
onUnmounted(() => {
    client.Utilities.Connection.removeEventListener(
        "statusChange",
        updateConnectionStatus,
    );
    client.dispose();
});

// Expose useful methods and properties for composition API usage
const connect = () => client.Utilities.Connection.connect();
const disconnect = () => client.Utilities.Connection.disconnect();
const query = client.Utilities.Connection.query;

// Export composition API
defineExpose({
    client,
    connectionStatus: readonly(connectionStatus),
    connect,
    disconnect,
    query,
});
</script>