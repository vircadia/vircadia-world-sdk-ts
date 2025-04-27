import { ref, readonly, shallowRef, type Ref, toRaw } from "vue"; // Removed watch, Import toRaw
import type { VircadiaInstance } from "../provider/useVircadia";
import type { Entity } from "../../../../../schema/schema.general"; // Import the Entity namespace
import { isEqual } from "lodash-es"; // Import isEqual for deep comparison

export interface UseVircadiaEntityOptions {
    /**
     * A Ref containing the ID (general__entity_id) of the entity to manage.
     * If both entityId and entityName are provided, entityId takes precedence for retrieval.
     */
    entityId?: Ref<string | null | undefined>;
    /**
     * A Ref containing the name of the entity to manage.
     * Used for retrieval if entityId is not provided.
     * The name is looked up in the 'general__entity_name' column.
     */
    entityName?: Ref<string | null | undefined>;
    /**
     * The SQL SELECT clause string (e.g., "*", "general__position, general__rotation").
     * Determines which properties are fetched. Defaults to "*".
     */
    selectClause?: string;
    /**
     * Parameters to use with the selectClause. Empty by default.
     */
    selectParams?: any[];
    /**
     * The SQL INSERT clause to execute for entity creation, following "INSERT INTO entity.entities".
     * Example: "(general__entity_name, general__position) VALUES ($1, $2) RETURNING general__entity_id"
     * Include "RETURNING general__entity_id" if you want the composable to return the created entity's ID.
     */
    insertClause?: string;
    /**
     * Parameters to use with the createInsertClause when creating a new entity.
     */
    insertParams?: any[];
    /** Vircadia instance */
    instance: VircadiaInstance;
}

// Helper function to determine the active identifier and query details
function getIdentifierDetails(
    idRef: Ref<string | null | undefined>,
    nameRef: Ref<string | null | undefined>,
    idColumn: string, // Keep parameters for clarity within the helper
    nameColumn: string, // Keep parameter name for clarity, but value is hardcoded
): { identifier: string; column: string; value: string } | null {
    const id = idRef.value;
    const name = nameRef.value;

    if (id) {
        return { identifier: "id", column: idColumn, value: id };
    }
    if (name) {
        // Use hardcoded name column here
        return {
            identifier: "name",
            column: "general__entity_name",
            value: name,
        };
    }
    return null;
}

/**
 * Composable for manually managing a specific Vircadia entity's properties
 * from the 'entity.entities' table using 'general__entity_id' or 'general__entity_name' as the key.
 * Allows specifying which columns to fetch via a SELECT clause string,
 * executing updates via a custom SET clause string, and creating
 * the entity using a specific INSERT clause. All operations (retrieve, update, create)
 * must be triggered manually via the returned functions.
 *
 * @param options - Configuration options including entityId, entityName, SELECT clause, and creation behavior.
 * @returns Reactive refs for entity data, retrieving/updating/creating state, errors, and manual action functions.
 */
export function useVircadiaEntity(options: UseVircadiaEntityOptions) {
    const {
        entityId = ref(null),
        entityName = ref(null),
        selectClause = "*",
        selectParams = [],
        // insertIfNotExist is removed as creation is now manual
        insertClause: createInsertClause = "",
        insertParams: createInsertParams = [],
        instance,
    } = options;

    // Hardcoded table and ID/Name column names based on schema
    const TABLE_NAME = "entity.entities"; // Added table name constant
    const ID_COLUMN = "general__entity_id";
    const NAME_COLUMN = "general__entity_name";

    const entityData = shallowRef<Entity.I_Entity | null>(null);
    const retrieving = ref(false);
    const updating = ref(false);
    const creating = ref(false);
    const error = ref<Error | null>(null);
    const vircadia = instance;

    if (!vircadia) {
        throw new Error(
            `Vircadia instance (${options.instance}) not found. Ensure you are using this composable within a Vircadia context.`,
        );
    }

    let isUnmounted = false;

    // --- Entity Creation ---
    // Internal function to perform the creation database query
    const performCreate = async (): Promise<string | null> => {
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

        const query = `INSERT INTO ${TABLE_NAME} ${createInsertClause}`;
        console.log(
            `Attempting to create entity using query: ${query}`,
            createInsertParams,
        );

        try {
            const createResult =
                await vircadia.client.Utilities.Connection.query<
                    Pick<Entity.I_Entity, "general__entity_id">[]
                >({
                    query,
                    parameters: createInsertParams,
                    timeoutMs: 10000,
                });

            if (isUnmounted) return null;

            if (
                createResult.result.length > 0 &&
                createResult.result[0].general__entity_id
            ) {
                const createdId = createResult.result[0].general__entity_id;
                console.log(
                    `Successfully created entity with ID: ${createdId}`,
                );
                // Return the ID obtained from RETURNING clause
                // Do not automatically fetch or update local state here
                return createdId;
            }

            console.warn(
                "Entity possibly created, but failed to retrieve ID (was RETURNING general__entity_id included in the insert clause?).",
            );
            // Return null if ID wasn't returned
            return null;
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

    // Public function to trigger entity creation
    const executeCreate = async (): Promise<string | null> => {
        return performCreate();
    };

    // --- Data Fetching ---
    // Internal function to perform the fetch database query
    const performRetrieve = async () => {
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

        // Get current values from refs
        const currentEntityId = entityId.value;
        const currentEntityName = entityName.value;

        // Log what we're working with for debugging
        console.log(
            `Entity retrieve called with ID: ${currentEntityId}, Name: ${currentEntityName}`,
        );

        const activeIdentifier = getIdentifierDetails(
            entityId,
            entityName,
            ID_COLUMN,
            NAME_COLUMN,
        );

        if (!activeIdentifier) {
            console.warn(
                "performRetrieve skipped: Neither entityId nor entityName is provided.",
            );
            entityData.value = null; // Ensure data is null if no identifier
            error.value = new Error(
                "Retrieve operation skipped: No identifier provided.",
            );
            return;
        }

        retrieving.value = true;
        error.value = null; // Clear previous errors before fetching
        const { column, value } = activeIdentifier;

        try {
            // Ensure the ID column is always selected if not selecting "*"
            const effectiveSelectClause =
                selectClause.includes(ID_COLUMN) || selectClause.trim() === "*"
                    ? selectClause
                    : `${selectClause}, ${ID_COLUMN}`;

            // Adjust parameter indices for the select clause if needed
            const allParameters = [value, ...selectParams];
            const adjustedSelectClause = effectiveSelectClause.replace(
                /\$(\d+)/g,
                (_, n) => `$${Number.parseInt(n, 10) + 1}`,
            );

            const query = `SELECT ${adjustedSelectClause} FROM ${TABLE_NAME} WHERE ${column} = $1`;
            console.log(
                `Fetching entity by ${column} = ${value} with clause: ${adjustedSelectClause}`,
            );

            const queryResult =
                await vircadia.client.Utilities.Connection.query<
                    Entity.I_Entity[]
                >({
                    query,
                    parameters: allParameters,
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
                console.warn(`Entity with ${column} = ${value} not found.`);
                entityData.value = null; // Set data to null if not found
            }
        } catch (err) {
            if (isUnmounted) return;
            console.error(
                `Error fetching entity by ${column} = ${value}:`,
                err,
            );
            const fetchError =
                err instanceof Error
                    ? err
                    : new Error("Failed to fetch entity data");
            // Only update error ref if it's a new error or null
            if (!error.value || error.value?.message !== fetchError.message) {
                error.value = fetchError;
            }
            entityData.value = null; // Ensure data is null on fetch error
        } finally {
            if (!isUnmounted) {
                retrieving.value = false;
            }
        }
    };

    // Public function to trigger a fetch
    const executeRetrieve = () => {
        performRetrieve();
    };

    // --- Data Updating ---
    // Internal function to perform the update database query
    const performUpdate = async (setClause: string, updateParams: any[]) => {
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

        // Use the ID from the potentially just updated entityData
        const currentId = entityData.value?.general__entity_id;

        if (!currentId) {
            console.warn(
                "performUpdate skipped: Entity ID not available in local data. Ensure entity is loaded via executeRetrieve first.",
            );
            error.value = new Error("Cannot update: Entity ID not available.");
            return;
        }

        if (!setClause.trim()) {
            console.warn("performUpdate skipped: Empty SET clause provided.");
            error.value = new Error("Cannot update: Empty SET clause.");
            return;
        }

        updating.value = true;
        error.value = null;

        // Adjust parameter indices for the set clause
        const parameters = [currentId, ...updateParams];
        const adjustedSetClause = setClause.replace(
            /\$(\d+)/g,
            (_, n) => `$${Number.parseInt(n, 10) + 1}`,
        );

        const query = `UPDATE ${TABLE_NAME} SET ${adjustedSetClause} WHERE ${ID_COLUMN} = $1`;

        console.log(
            `Executing update for entity ${currentId}: SET ${adjustedSetClause}`,
            updateParams,
        );

        try {
            await vircadia.client.Utilities.Connection.query({
                query,
                parameters,
                timeoutMs: 10000,
            });

            if (isUnmounted) return;
            console.log(`Successfully executed update for entity ${currentId}`);
            error.value = null; // Clear error on success
        } catch (err) {
            if (isUnmounted) return;
            console.error(
                `Error executing update for entity ${currentId}:`,
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

    // Public function to trigger an update
    const executeUpdate = (setClause: string, parameters: any[]) => {
        performUpdate(setClause, parameters);
    };

    // --- Cleanup ---
    const cleanup = () => {
        console.log(
            `useVircadiaEntity cleanup called for ${entityId.value || entityName.value}`,
        );
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
