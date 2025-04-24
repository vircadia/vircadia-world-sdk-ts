<template>
  <slot
    :entity-data="entityData"
    :retrieving="retrieving"
    :updating="updating"
    :creating="creating"
    :error="error"
    :execute-update="executeUpdate"
    :refresh="refresh"
  ></slot>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import {
    useVircadiaEntity,
    type UseVircadiaEntityOptions,
} from "../composable/useVircadiaEntity";
import type { Entity } from "../../../../../schema/schema.general"; // Import the Entity namespace

// Export the Entity type for consumers of this component
export type { Entity };

// Define props based on the composable's options, allowing direct passing
// or separate id/name props for convenience.
const props = defineProps<UseVircadiaEntityOptions>();

// Create reactive refs for the identifier props
const entityIdRef = toRef(props, "entityId");
const entityNameRef = toRef(props, "entityName");

// Use the composable directly with props
const {
    entityData,
    retrieving,
    updating,
    creating,
    error,
    executeUpdate,
    refresh,
} = useVircadiaEntity({
    entityId: entityIdRef.value,
    entityName: entityNameRef.value,
    selectClause: props.selectClause,
    pollIntervalMs: props.pollIntervalMs,
    createIfNotExist: props.createIfNotExist,
    defaultCreateProperties: props.defaultCreateProperties,
});
</script>