<template>
  <slot
    :asset-data="assetData"
    :loading="loading"
    :error="error"
  ></slot>
</template>

<script setup lang="ts">
import { toRefs } from "vue";
// Import the composable
import {
    useVircadiaAsset,
    type VircadiaAssetData,
} from "../composable/useVircadiaAsset";

// Keep the VircadiaAssetData interface export if needed elsewhere,
// otherwise it can be removed if only used internally by the composable.
export type { VircadiaAssetData };

const props = defineProps<{
    fileName: string;
}>();
const { fileName } = toRefs(props);

// Use the composable, passing the reactive fileName
const { assetData, loading, error } = useVircadiaAsset(fileName);
</script>