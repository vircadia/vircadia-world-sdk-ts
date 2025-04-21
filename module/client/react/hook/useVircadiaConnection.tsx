import { useVircadia } from "./useVircadia";

export const useVircadiaConnection = () => {
    const { connectionStatus, connect, disconnect, error } = useVircadia();
    return { connectionStatus, connect, disconnect, error };
};
