import { ref, watch, onUnmounted, readonly, shallowRef, type Ref } from "vue";
import { useVircadia } from "../provider/useVircadia";
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
     * The SQL SELECT clause string (e.g., "*", "name, description", "general__position").
     * Determines which properties are fetched. Defaults to "*".
     */
    selectClause?: string;
    /** Interval in milliseconds to automatically refresh data. Set to null or 0 to disable polling. */
    pollIntervalMs?: number | null;
    /** If true, automatically create the entity if it doesn't exist when fetching by ID or name. Defaults to false. */
    createIfNotExist?: boolean;
    /** Default properties to set when creating a new entity. The identifying property (ID or name) will be added automatically. */
    defaultCreateProperties?: Partial<Entity.I_Entity>; // Use partial entity type
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
 * the entity if it does not exist.
 *
 * @param options - Configuration options including entityId, entityName, SELECT clause, creation behavior, and polling.
 * @returns Reactive refs for entity data, retrieving/updating/creating state, errors, and update/refresh functions.
 */
export function useVircadiaEntity(options: UseVircadiaEntityOptions = {}) {
    const {
        entityId = ref(null), // Now part of options
        entityName = ref(null),
        selectClause = "*",
        pollIntervalMs = null,
        createIfNotExist = false,
        defaultCreateProperties = {},
    } = options;

    // Hardcoded table and ID/Name column names based on schema are now directly in queries/helpers
    const ID_COLUMN = "general__entity_id";
    const NAME_COLUMN = "general__entity_name";

    const entityData = shallowRef<Entity.I_Entity | null>(null); // Use I_Entity
    const retrieving = ref(false);
    const updating = ref(false);
    const creating = ref(false); // Represents the state of an ongoing create query
    const error = ref<Error | null>(null);
    const vircadia = useVircadia();

    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let isUnmounted = false;

    // --- Entity Creation ---
    const performCreate = async (identifierDetails: {
        column: string;
        value: string;
    }): Promise<string | null> => {
        creating.value = true;
        error.value = null;
        console.log(
            `Attempting to create entity with ${identifierDetails.column}: ${identifierDetails.value}`,
        );

        const propertiesToInsert: Partial<Entity.I_Entity> = {
            // Use partial entity type
            ...defaultCreateProperties,
            [identifierDetails.column as keyof Entity.I_Entity]:
                identifierDetails.value, // Type assertion needed here
        };

        // Ensure ID is included if it's the identifier and not already in defaults
        if (
            identifierDetails.column === ID_COLUMN &&
            !(ID_COLUMN in propertiesToInsert)
        ) {
            propertiesToInsert.general__entity_id = identifierDetails.value;
        }

        // Filter out undefined values before creating columns/placeholders
        const validProperties = Object.entries(propertiesToInsert).filter(
            ([, value]) => value !== undefined,
        );
        const columns = validProperties.map(([key]) => key);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
        const values = validProperties.map(([, value]) => value);

        // Assumes INSERT...RETURNING general__entity_id is supported.
        const query = `INSERT INTO entity.entities (${columns.join(", ")}) VALUES (${placeholders}) RETURNING ${ID_COLUMN}`;

        try {
            // Specify return type expecting an object with the correct ID property
            const createResult =
                await vircadia.client.Utilities.Connection.query<
                    Pick<Entity.I_Entity, "general__entity_id">[] // Expecting the ID field
                >({
                    query,
                    parameters: values,
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
                return createdId;
            }

            console.warn(
                "Entity possibly created, but failed to retrieve ID immediately via RETURNING.",
            );
            // If we created by ID, that ID is the one we used.
            return identifierDetails.column === ID_COLUMN
                ? identifierDetails.value
                : null;
        } catch (err) {
            if (isUnmounted) return null;
            console.error(
                `Error creating entity with ${identifierDetails.column} ${identifierDetails.value}:`,
                err,
            );
            error.value =
                err instanceof Error
                    ? err
                    : new Error("Failed to create entity");
            return null;
        } finally {
            // creating state is reset in fetchData after potential re-fetch
        }
    };

    // --- Data Fetching (modified) ---
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
            // Ensure the ID column is always selected for consistency
            const effectiveSelectClause =
                selectClause.includes(ID_COLUMN) || selectClause.trim() === "*"
                    ? selectClause
                    : `${selectClause}, ${ID_COLUMN}`;

            const query = `SELECT ${effectiveSelectClause} FROM entity.entities WHERE ${column} = $1`;
            console.log(
                `Fetching entity by ${column} = ${value} with clause: ${effectiveSelectClause}`,
            );

            const queryResult =
                await vircadia.client.Utilities.Connection.query<
                    Entity.I_Entity[]
                >({
                    // Use I_Entity[]
                    query,
                    parameters: [value],
                    timeoutMs: 10000,
                });

            if (isUnmounted) return;

            if (queryResult.result.length > 0) {
                // Entity found
                entityData.value = { ...queryResult.result[0] }; // Assign directly
                console.log("Entity found/updated:", entityData.value);
            } else {
                // Not found
                console.warn(`Entity with ${column} = ${value} not found.`);
                if (createIfNotExist) {
                    const createdId = await performCreate(activeIdentifier);
                    if (createdId && !isUnmounted) {
                        // Successfully created, now fetch the data using the ID
                        console.log(
                            `Re-fetching entity data after creation (ID: ${createdId})...`,
                        );
                        // Fetch using the known created ID.
                        // This ensures we get all columns specified by selectClause.
                        await fetchData({
                            identifier: "id",
                            column: ID_COLUMN, // Use hardcoded ID column
                            value: createdId,
                        });
                        // Note: The original entityId ref passed by the consumer is NOT updated here.
                    } else if (!isUnmounted) {
                        // Creation failed or component unmounted during creation
                        entityData.value = null;
                        // Error state should be set by performCreate
                    }
                } else {
                    // Not found and not creating
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
            // Ensure creating is false if fetch fails after a create attempt
            creating.value = false;
            if (!isUnmounted) {
                retrieving.value = false;
            }
        }
    };

    // --- Data Updating (modified) ---
    // biome-ignore lint/suspicious/noExplicitAny: Parameters can be of any type
    const performUpdate = async (setClause: string, updateParams: any[]) => {
        // Get the ID from the currently loaded entity data using the schema property name
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

        // Parameters: ID is first, then the rest for the SET clause
        const parameters = [currentId, ...updateParams];
        // Adjust parameter placeholders in SET clause assuming ID is $1
        const adjustedSetClause = setClause.replace(
            /\$(\d+)/g,
            (_, n) => `$${Number.parseInt(n, 10) + 1}`,
        );
        const query = `UPDATE entity.entities SET ${adjustedSetClause} WHERE ${ID_COLUMN} = $1`;

        console.log(
            `Executing update for entity ${currentId}: SET ${adjustedSetClause}`,
            updateParams, // Log original params for clarity
        );

        try {
            await vircadia.client.Utilities.Connection.query({
                query,
                parameters,
                timeoutMs: 10000,
            });

            if (isUnmounted) return;
            console.log(`Successfully executed update for entity ${currentId}`);
            // Consider adding an option to automatically refresh after update
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

    // Exposed update function
    // biome-ignore lint/suspicious/noExplicitAny: Parameters can be of any type
    const executeUpdate = (setClause: string, parameters: any[]) => {
        performUpdate(setClause, parameters);
    };

    // --- Watchers and Lifecycle (modified) ---
    const triggerFetch = () => {
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
            pollIntervalId = null;
        }
        // Reset state immediately on identifier change
        entityData.value = null;
        error.value = null;
        retrieving.value = false;
        updating.value = false;
        creating.value = false;

        const activeIdentifier = getIdentifierDetails(
            entityId, // Now from options
            entityName, // Now from options
            ID_COLUMN, // Hardcoded ID column
            NAME_COLUMN, // Hardcoded Name column
        );

        if (activeIdentifier) {
            fetchData(activeIdentifier); // Start fetch/create process

            if (pollIntervalMs && pollIntervalMs > 0) {
                pollIntervalId = setInterval(() => {
                    // Re-check identifier details in case they changed between intervals
                    const currentActiveIdentifier = getIdentifierDetails(
                        entityId, // Now from options
                        entityName, // Now from options
                        ID_COLUMN, // Hardcoded ID column
                        NAME_COLUMN, // Hardcoded Name column
                    );
                    if (
                        currentActiveIdentifier &&
                        !retrieving.value &&
                        !updating.value &&
                        !creating.value && // Don't poll while creating/updating
                        !isUnmounted
                    ) {
                        fetchData(currentActiveIdentifier); // Poll using the latest active identifier
                    }
                }, pollIntervalMs);
            }
        } else {
            console.warn(
                "useVircadiaEntity: Neither entityId nor entityName is provided. No entity will be loaded.",
            );
        }
    };

    // Watch both potential identifiers
    watch([entityId, entityName], triggerFetch, { immediate: true });

    onUnmounted(() => {
        isUnmounted = true;
        if (pollIntervalId) {
            clearInterval(pollIntervalId);
        }
        console.log("Unmounting entity composable.");
    });

    // Exposed refresh function (modified)
    const refresh = () => {
        const activeIdentifier = getIdentifierDetails(
            entityId, // Now from options
            entityName, // Now from options
            ID_COLUMN, // Hardcoded ID column
            NAME_COLUMN, // Hardcoded Name column
        );
        // Only refresh if an identifier exists and not busy
        if (
            activeIdentifier &&
            !retrieving.value &&
            !creating.value &&
            !updating.value
        ) {
            fetchData(activeIdentifier);
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
        creating: readonly(creating), // Expose creating state
        error: readonly(error),
        executeUpdate,
        refresh,
    };
}
