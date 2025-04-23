import { inject, ref, readonly, computed } from "vue";

// Import the shared keys
import {
    VIRCADIA_CLIENT_KEY,
    VIRCADIA_CONNECTION_INFO_KEY,
} from "./injectionKeys";

/**
 * Vircadia client composable for Vue applications.
 * Must be used within a component that is a descendant of VircadiaProvider.
 * Provides reactive state and methods to interact with the Vircadia connection.
 */
export function useVircadia() {
    // Inject using the imported keys
    const client = inject(VIRCADIA_CLIENT_KEY);
    const connectionInfo = inject(VIRCADIA_CONNECTION_INFO_KEY);

    // Ensure the composable is used within the provider context
    if (!client || !connectionInfo) {
        throw new Error(
            "useVircadia() must be used within a <VircadiaProvider> component.",
        );
    }

    // Create simplified reactive API
    return {
        connectionInfo, // Return the reactive ref directly, it's already readonly from the provider
        // Raw client access if needed
        client,
    };
}
