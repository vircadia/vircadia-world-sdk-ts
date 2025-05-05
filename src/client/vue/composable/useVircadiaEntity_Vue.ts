import { ref, readonly, shallowRef, type Ref, toRaw, inject } from "vue"; // Removed watch, Import toRaw
import {
    type I_VircadiaInstance_Vue,
    getVircadiaInstanceKey_Vue,
} from "../provider/useVircadia_Vue";
import type { Entity } from "../../../schema/vircadia.schema.general"; // Import the Entity namespace
import { isEqual } from "lodash-es"; // Import isEqual for deep comparison

/**
 * Composable for manually managing a specific Vircadia entity's properties
 * from the 'entity.entities' table using 'general__entity_name' as the key.
 * Allows specifying which columns to fetch via a SELECT clause string,
 * executing updates via a custom SET clause string, and creating
 * the entity using a specific INSERT clause. All operations (retrieve, update, create)
 * must be triggered manually via the returned functions.
 *
 * @param options - Configuration options including entityName, SELECT clause, and creation behavior.
 * @returns Reactive refs for entity data, retrieving/updating/creating state, errors, and manual action functions.
 */
export function useVircadiaEntity_Vue(options: {
    /**
     * A Ref containing the name (general__entity_name) of the entity to manage.
     * Required for entity retrieval.
     */
    entityName: Ref<string | null | undefined>;
    /**
     * The SQL SELECT clause string (e.g., "*", "general__position, general__rotation").
     * Determines which properties are fetched. Defaults to "*".
     */
    selectClause?: string;
    /**
     * Parameters to use with the selectClause. Empty by default.
     */
    selectParams?: unknown[];
    /**
     * The SQL INSERT clause to execute for entity creation, following "INSERT INTO entity.entities".
     * Example: "(general__entity_name, general__position) VALUES ($1, $2) RETURNING general__entity_name"
     * Include "RETURNING general__entity_name" if you want the composable to return the created entity's name.
     */
    insertClause?: string;
    /**
     * Parameters to use with the createInsertClause when creating a new entity.
     */
    insertParams?: unknown[];
    /**
     * Vircadia instance. If not provided, will try to inject from component context.
     */
    instance?: I_VircadiaInstance_Vue;
}) {
    const {
        entityName,
        selectClause = "*",
        selectParams = [],
        // insertIfNotExist is removed as creation is now manual
        insertClause: createInsertClause = "",
        insertParams: createInsertParams = [],
    } = options;

    // Hardcoded table and ID column name based on schema
    const TABLE_NAME = "entity.entities"; // Added table name constant
    const NAME_COLUMN = "general__entity_name";

    const entityData = shallowRef<Entity.I_Entity | null>(null);
    const retrieving = ref(false);
    const updating = ref(false);
    const creating = ref(false);
    const error = ref<Error | null>(null);

    // Use provided instance or try to inject from context
    const vircadia = options.instance || inject(getVircadiaInstanceKey_Vue());

    if (!vircadia) {
        throw new Error(
            "Vircadia instance not found. Either provide an instance in options or ensure this composable is used within a component with a provided Vircadia instance.",
        );
    }

    let isUnmounted = false;

    // --- Entity Creation ---
    // Internal function to perform the creation database query
    const executeCreate = async (): Promise<string | null> => {
        // Prevent create if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "performCreate skipped: Another operation (fetch, create, update) is already in progress.",
            );
            error.value = new Error(
                "Create operation skipped: Another operation in progress.",
            );
            return null;
        }

        creating.value = true;
        error.value = null;

        if (!createInsertClause.trim()) {
            console.error(
                "Cannot create entity: `insertClause` option is missing or empty.",
            );
            error.value = new Error(
                "Entity creation failed: Missing INSERT clause.",
            );
            creating.value = false;
            return null;
        }

        // Get the entity name from the parameters
        let entityNameToUse = null;
        if (
            createInsertParams.length > 0 &&
            typeof createInsertParams[0] === "string"
        ) {
            entityNameToUse = createInsertParams[0];
        }

        if (!entityNameToUse) {
            console.error(
                "Cannot create entity: No entity name provided in parameters.",
            );
            error.value = new Error(
                "Entity creation failed: Missing entity name.",
            );
            creating.value = false;
            return null;
        }

        const query = `INSERT INTO ${TABLE_NAME} ${createInsertClause}`;
        console.log(
            `Attempting to create entity using query: ${query}`,
            createInsertParams,
        );

        try {
            const createResult =
                await vircadia.client.Utilities.Connection.query<
                    Pick<Entity.I_Entity, "general__entity_name">[]
                >({
                    query,
                    parameters: createInsertParams,
                    timeoutMs: 10000,
                });

            if (isUnmounted) return null;

            if (
                createResult.result.length > 0 &&
                createResult.result[0].general__entity_name
            ) {
                const createdName = createResult.result[0].general__entity_name;
                console.log(
                    `Successfully created entity with name: ${createdName}`,
                );
                // Return the name obtained from RETURNING clause
                // Do not automatically fetch or update local state here
                return createdName;
            }

            console.warn(
                "Entity possibly created, but failed to retrieve name. Returning the name provided in parameters:",
                entityNameToUse,
            );
            // Return the name we tried to create with
            return entityNameToUse;
        } catch (err) {
            if (isUnmounted) return null;
            console.error(`Error creating entity using query "${query}":`, err);
            error.value =
                err instanceof Error
                    ? err
                    : new Error("Failed to create entity");
            return null; // Return null on creation error
        } finally {
            if (!isUnmounted) {
                creating.value = false;
            }
        }
    };

    // --- Data Fetching ---
    // Internal function to perform the fetch database query
    const executeRetrieve = async () => {
        // Prevent fetch if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "performRetrieve skipped: Another operation (fetch, create, update) is already in progress.",
            );
            error.value = new Error(
                "Retrieve operation skipped: Another operation in progress.",
            );
            return;
        }

        // Get current value from name ref
        const currentEntityName = entityName.value;

        // Log what we're working with for debugging
        console.log(`Entity retrieve called with name: ${currentEntityName}`);

        if (!currentEntityName) {
            console.warn(
                "performRetrieve skipped: entityName is not provided.",
            );
            entityData.value = null; // Ensure data is null if no identifier
            error.value = new Error(
                "Retrieve operation skipped: No entity name provided.",
            );
            return;
        }

        retrieving.value = true;
        error.value = null; // Clear previous errors before fetching

        try {
            // Ensure the name column is always selected if not selecting "*"
            const effectiveSelectClause =
                selectClause.includes(NAME_COLUMN) ||
                selectClause.trim() === "*"
                    ? selectClause
                    : `${selectClause}, ${NAME_COLUMN}`;

            const query = `SELECT ${effectiveSelectClause} FROM ${TABLE_NAME} WHERE ${NAME_COLUMN} = '${currentEntityName}'`;
            console.log(
                `Fetching entity by ${NAME_COLUMN} = ${currentEntityName} with clause: ${effectiveSelectClause}`,
            );

            const queryResult =
                await vircadia.client.Utilities.Connection.query<
                    Entity.I_Entity[]
                >({
                    query,
                    parameters: selectParams,
                    timeoutMs: 10000,
                });

            if (isUnmounted) return;

            if (queryResult.result && queryResult.result.length > 0) {
                const newData = queryResult.result[0];
                // Deep compare new data with the raw existing data before assigning
                if (
                    !entityData.value ||
                    !isEqual(toRaw(entityData.value), newData)
                ) {
                    entityData.value = { ...newData }; // Assign new object only if different
                    console.log("Entity data updated:", entityData.value);
                } else {
                    console.log("Entity data fetched but unchanged.");
                }
                error.value = null; // Clear error on successful fetch/update
            } else {
                // Entity not found
                console.warn(
                    `Entity with ${NAME_COLUMN} = ${currentEntityName} not found.`,
                );
                entityData.value = null; // Set data to null if not found
            }
        } catch (err) {
            if (isUnmounted) return;
            console.error(
                `Error fetching entity by ${NAME_COLUMN} = ${currentEntityName}:`,
                err,
            );
            const fetchError =
                err instanceof Error
                    ? err
                    : new Error("Failed to fetch entity data");
            // Only update error ref if it's a new error or null
            if (
                !error.value ||
                fetchError.message !== (error.value as Error).message
            ) {
                error.value = fetchError;
            }
            entityData.value = null; // Ensure data is null on fetch error
        } finally {
            if (!isUnmounted) {
                retrieving.value = false;
            }
        }
    };

    // --- Data Updating ---
    // Internal function to perform the update database query
    const executeUpdate = async (
        setClause: string,
        updateParams: unknown[],
    ) => {
        // Prevent update if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "performUpdate skipped: Another operation (fetch, create, update) is already in progress.",
            );
            error.value = new Error(
                "Update operation skipped: Another operation in progress.",
            );
            return;
        }

        // Use the name from the potentially just updated entityData
        const currentName = entityData.value?.general__entity_name;

        if (!currentName) {
            console.warn(
                "performUpdate skipped: Entity name not available in local data. Ensure entity is loaded via executeRetrieve first.",
            );
            error.value = new Error(
                "Cannot update: Entity name not available.",
            );
            return;
        }

        if (!setClause.trim()) {
            console.warn("performUpdate skipped: Empty SET clause provided.");
            error.value = new Error("Cannot update: Empty SET clause.");
            return;
        }

        updating.value = true;
        error.value = null;

        const query = `UPDATE ${TABLE_NAME} SET ${setClause} WHERE ${NAME_COLUMN} = '${currentName}'`;

        console.log(`Executing update for entity ${currentName}: ${query}`);

        try {
            await vircadia.client.Utilities.Connection.query({
                query,
                parameters: updateParams,
                timeoutMs: 10000,
            });

            if (isUnmounted) return;
            console.log(
                `Successfully executed update for entity ${currentName}`,
            );
            error.value = null; // Clear error on success
        } catch (err) {
            if (isUnmounted) return;
            console.error(
                `Error executing update for entity ${currentName}:`,
                err,
            );
            error.value =
                err instanceof Error
                    ? err
                    : new Error("Failed to execute entity update");
        } finally {
            if (!isUnmounted) {
                updating.value = false;
            }
        }
    };

    // --- Cleanup ---
    const cleanup = () => {
        console.log(`useVircadiaEntity cleanup called for ${entityName.value}`);
        isUnmounted = true; // Flag to prevent async operations from updating state after cleanup
    };

    return {
        entityData: readonly(entityData),
        retrieving: readonly(retrieving),
        updating: readonly(updating),
        creating: readonly(creating),
        error: readonly(error),
        executeRetrieve, // Manually trigger data fetching
        executeUpdate, // Manually trigger data update
        executeCreate, // Manually trigger entity creation
        cleanup,
    };
}
