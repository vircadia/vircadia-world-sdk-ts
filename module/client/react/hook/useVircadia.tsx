import { useContext } from "react";
import { VircadiaContext } from "../VircadiaProvider";

// Custom hooks
export const useVircadia = () => useContext(VircadiaContext);
