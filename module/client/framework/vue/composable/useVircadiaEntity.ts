import { ref, watch, readonly, shallowRef, type Ref } from "vue";
import type { VircadiaInstance } from "../provider/useVircadia";
import type { Entity } from "../../../../../schema/schema.general"; // Import the Entity namespace

export interface UseVircadiaEntityOptions {
    /**
     * A Ref containing the ID (general__entity_id) of the entity to manage.
     * If both entityId and entityName are provided, entityId takes precedence.
     */
    entityId?: Ref<string | null | undefined>;
    /**
     * A Ref containing the name of the entity to manage.
     * If both entityId and entityName are provided, entityId takes precedence.
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
    /** If true, automatically create the entity if it doesn't exist when fetching by ID or name. Defaults to false. */
    insertIfNotExist?: boolean;
    /**
     * The SQL INSERT clause to execute for entity creation, following "INSERT INTO entity.entities".
     * Example: "(general__entity_name, general__position) VALUES ($1, $2) RETURNING general__entity_id"
     * Note: The composable handles the "if not exist" logic by attempting creation only after a fetch fails.
     * Include "RETURNING general__entity_id" if you want the composable to automatically fetch the created entity.
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
 * Composable for reactively managing a specific Vircadia entity's properties
 * from the 'entity.entities' table using 'general__entity_id' or 'general__entity_name' as the key.
 * Allows specifying which columns to fetch via a SELECT clause string,
 * executing updates via a custom SET clause string, and optionally creating
 * the entity if it does not exist using a specific INSERT clause.
 *
 * @param options - Configuration options including entityId, entityName, SELECT clause, and creation behavior.
 * @returns Reactive refs for entity data, retrieving/updating/creating state, errors, and update/refresh functions.
 */
export function useVircadiaEntity(options: UseVircadiaEntityOptions) {
    const {
        entityId = ref(null),
        entityName = ref(null),
        selectClause = "*",
        selectParams = [],
        insertIfNotExist: createIfNotExist = false,
        insertClause: createInsertClause = "", // Changed from createInsertQuery
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
    const performCreate = async (identifierDetails: {
        column: string;
        value: string;
    }): Promise<string | null> => {
        creating.value = true;
        error.value = null;

        // Check for the insert clause instead of the full query
        if (!createInsertClause.trim()) {
            console.error(
                "Cannot create entity: `createInsertClause` option is missing or empty.",
            );
            error.value = new Error(
                "Entity creation failed: Missing INSERT clause.",
            );
            creating.value = false;
            return null;
        }

        // Construct the full query
        const query = `INSERT INTO ${TABLE_NAME} ${createInsertClause}`;

        console.log(
            `Attempting to create entity (triggered by missing ${identifierDetails.column}: ${identifierDetails.value}) using query: ${query}`,
            createInsertParams,
        );

        try {
            const createResult =
                await vircadia.client.Utilities.Connection.query<
                    Pick<Entity.I_Entity, "general__entity_id">[]
                >({
                    query, // Use the constructed query
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
                return createdId;
            }

            console.warn(
                "Entity possibly created, but failed to retrieve ID immediately (was RETURNING general__entity_id included in the insert clause?).",
            );
            // If ID wasn't returned, but we were initially looking by ID, return that ID.
            // Otherwise, we can't be sure what the ID is.
            return identifierDetails.column === ID_COLUMN
                ? identifierDetails.value
                : null;
        } catch (err) {
            if (isUnmounted) return null;
            console.error(
                `Error creating entity using query "${query}":`, // Log the constructed query
                err,
            );
            error.value =
                err instanceof Error
                    ? err
                    : new Error("Failed to create entity");
            return null; // Return null on creation error
        } finally {
            // Ensure creating is set to false only if not unmounted
            if (!isUnmounted) {
                creating.value = false;
            }
        }
    };

    // --- Data Fetching ---
    const fetchData = async (activeIdentifier: {
        identifier: string;
        column: string;
        value: string;
    }) => {
        retrieving.value = true;
        creating.value = false; // Reset creating state at the start of fetch
        error.value = null;
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

            if (queryResult.result.length > 0) {
                entityData.value = { ...queryResult.result[0] };
                console.log("Entity found/updated:", entityData.value);
            } else {
                console.warn(`Entity with ${column} = ${value} not found.`);
                // Attempt creation only if not found and flag is set
                if (createIfNotExist) {
                    const createdId = await performCreate(activeIdentifier);
                    // If creation succeeded and returned an ID, re-fetch using that ID
                    if (createdId && !isUnmounted) {
                        console.log(
                            `Re-fetching entity data after creation attempt (using ID: ${createdId})...`,
                        );
                        // Fetch using the known ID column and the returned/assumed ID
                        await fetchData({
                            identifier: "id",
                            column: ID_COLUMN,
                            value: createdId,
                        });
                        // Important: Return here to prevent setting entityData to null below
                        return;
                    }

                    if (!isUnmounted) {
                        // Creation failed or didn't return an ID
                        entityData.value = null;
                    }
                } else {
                    // Not creating, so set data to null
                    entityData.value = null;
                }
            }
        } catch (err) {
            if (isUnmounted) return;
            console.error(
                `Error fetching entity by ${column} = ${value}:`,
                err,
            );
            error.value =
                err instanceof Error
                    ? err
                    : new Error("Failed to fetch entity data");
            entityData.value = null;
        } finally {
            // Ensure retrieving is set to false only if not unmounted and not currently creating
            if (!isUnmounted && !creating.value) {
                retrieving.value = false;
            }
        }
    };

    // --- Data Updating ---
    const performUpdate = async (setClause: string, updateParams: any[]) => {
        // Use the ID from the potentially just updated entityData
        const currentId = entityData.value?.general__entity_id;

        if (!currentId) {
            console.warn(
                "performUpdate skipped: Entity ID not available in local data. Ensure entity is loaded.",
            );
            error.value = new Error("Cannot update: Entity ID not available.");
            return;
        }

        if (!setClause.trim()) {
            console.warn("performUpdate skipped: Empty SET clause provided.");
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
            // Optional: Re-fetch data after update to ensure consistency,
            // especially if the update modified fields included in the selectClause.
            // Consider adding a flag or option for this behavior.
            // refresh(); // Example: uncomment to refresh after successful update
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
        // Prevent update if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "executeUpdate skipped: Another operation (fetch, create, update) is already in progress.",
            );
            return;
        }
        performUpdate(setClause, parameters);
    };

    // Function to trigger the initial fetch or re-fetch based on current ID/Name refs
    const triggerFetch = () => {
        // Reset state before fetching
        entityData.value = null;
        error.value = null;
        retrieving.value = false;
        updating.value = false;
        creating.value = false;

        const activeIdentifier = getIdentifierDetails(
            entityId,
            entityName,
            ID_COLUMN,
            NAME_COLUMN, // Pass hardcoded name column
        );

        if (activeIdentifier) {
            fetchData(activeIdentifier);
        } else {
            console.warn(
                "useVircadiaEntity: Neither entityId nor entityName is provided. No entity will be loaded.",
            );
            entityData.value = null; // Ensure data is null if no identifier
        }
    };

    const cleanup = () => {};

    // Watch for changes in entityId or entityName to trigger a fetch
    watch([entityId, entityName], triggerFetch, { immediate: true });

    // Public function to manually refresh data
    const executeRetrieve = () => {
        const activeIdentifier = getIdentifierDetails(
            entityId,
            entityName,
            ID_COLUMN,
            NAME_COLUMN, // Pass hardcoded name column
        );

        if (
            activeIdentifier &&
            !retrieving.value &&
            !creating.value &&
            !updating.value
        ) {
            console.log("Manual refresh triggered.");
            fetchData(activeIdentifier); // Re-fetch with the current identifier
        } else if (!activeIdentifier) {
            console.warn(
                "Refresh skipped: No active entity identifier (ID or Name).",
            );
        } else {
            console.warn(
                "Refresh skipped: An operation (fetch, create, update) is already in progress.",
            );
        }
    };

    return {
        entityData: readonly(entityData),
        retrieving: readonly(retrieving),
        updating: readonly(updating),
        creating: readonly(creating),
        error: readonly(error),
        executeUpdate,
        executeRetrieve,
        cleanup,
    };
}
