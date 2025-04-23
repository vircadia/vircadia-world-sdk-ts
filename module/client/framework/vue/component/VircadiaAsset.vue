<template>
  <slot
    :asset-data="assetData"
    :loading="loading"
    :error="error"
  ></slot>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, toRefs } from "vue";

// Import the Vircadia hook - this would need to be adjusted to match your Vue implementation
// Assuming you have a similar hook in your Vue codebase
import { useVircadia } from "../provider/useVircadia";

export interface VircadiaAssetData {
    arrayBuffer: ArrayBuffer;
    blob: Blob;
    type: string;
    url: string;
}

interface Props {
    fileName: string;
}

const props = defineProps<Props>();
const { fileName } = toRefs(props);

const assetData = ref<VircadiaAssetData | null>(null);
const loading = ref(false);
const error = ref<Error | null>(null);

const vircadia = useVircadia();

const loadAsset = async (assetFileName: string) => {
    loading.value = true;
    error.value = null;

    try {
        console.log(`Starting to load asset: ${assetFileName}`);

        // Fetch from database
        const queryResult = await vircadia.client.Utilities.Connection.query<
            {
                asset__data__bytea:
                    | ArrayBufferLike
                    | {
                          type: string;
                          data: number[];
                      };
                asset__mime_type: string;
            }[]
        >({
            query: `
        SELECT asset__data__bytea, asset__mime_type
        FROM entity.entity_assets
        WHERE general__asset_file_name = $1
      `,
            parameters: [assetFileName],
            timeoutMs: 100000,
        });

        if (!queryResult.result[0]) {
            throw new Error(`Asset ${assetFileName} not found`);
        }

        // Process bytea data
        const rawData = queryResult.result[0].asset__data__bytea;
        const mimeType = queryResult.result[0].asset__mime_type;

        // Handle bytea data in different formats
        let byteArray: number[] = [];
        if (
            rawData &&
            typeof rawData === "object" &&
            "data" in rawData &&
            // biome-ignore lint/suspicious/noExplicitAny: Data can be of any type potentially.
            Array.isArray((rawData as unknown as any).data)
        ) {
            // biome-ignore lint/suspicious/noExplicitAny: Data can be of any type potentially.
            byteArray = (rawData as unknown as any).data;
        } else if (Array.isArray(rawData)) {
            byteArray = rawData;
        }

        // Convert to array buffer and blob
        const uint8Array = new Uint8Array(byteArray);
        const arrayBuffer = uint8Array.buffer;
        const blob = new Blob([uint8Array], { type: mimeType });
        const url = URL.createObjectURL(blob);

        assetData.value = {
            arrayBuffer,
            blob,
            type: mimeType,
            url,
        };

        console.log(
            `Successfully loaded asset: ${assetFileName}, type: ${mimeType}, size: ${byteArray.length} bytes`,
        );
    } catch (err) {
        console.error(`Error loading asset ${assetFileName}:`, err);
        error.value =
            err instanceof Error ? err : new Error("Failed to load asset");
    } finally {
        loading.value = false;
        console.log(`Finished loading attempt for asset: ${assetFileName}`);
    }
};

// Load the asset when the component mounts or when fileName changes
watch(
    fileName,
    (newFileName) => {
        if (newFileName) {
            // Clean up previous URL if it exists
            if (assetData.value?.url) {
                URL.revokeObjectURL(assetData.value.url);
            }

            loadAsset(newFileName);
        }
    },
    { immediate: true },
);

// Clean up URL object when component unmounts
onUnmounted(() => {
    if (assetData.value?.url) {
        URL.revokeObjectURL(assetData.value.url);
    }
});
</script>