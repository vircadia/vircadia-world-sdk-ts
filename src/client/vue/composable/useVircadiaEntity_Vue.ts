import { ref, readonly, shallowRef, type Ref, toRaw, inject, watch } from "vue"; // Removed watch, Import toRaw
import {
    type I_VircadiaInstance_Vue,
    getVircadiaInstanceKey_Vue,
} from "../provider/useVircadia_Vue";
import type { Entity } from "../../../schema/vircadia.schema.general"; // Import the Entity namespace
import { isEqual } from "lodash-es"; // Import isEqual for deep comparison
import type { z } from "zod"; // Import zod for schema validation

/**
 * Composable for manually managing a Vircadia entity with typed metadata support.
 *
 * This composable provides a Vue-friendly way to interact with entities in the 'entity.entities' table,
 * using 'general__entity_name' as the primary key. It handles:
 *
 * - Data fetching with customizable SELECT queries
 * - Entity creation with customizable INSERT queries
 * - Entity updates with customizable SET clauses
 * - Typed metadata via Zod schema validation
 *
 * All database operations must be triggered manually through the returned functions.
 * The entityData returned will contain properly typed meta__data based on the provided schema.
 *
 * @template MetaSchema - Zod schema type used to validate and type the entity's meta__data
 * @param options - Configuration options for entity management
 * @returns Object containing entity data with typed metadata, status refs, and operation functions
 */
export function useVircadiaEntity_Vue<
    MetaSchema extends z.ZodType = z.ZodAny,
>(options: {
    /**
     * A Ref containing the entity name (general__entity_name) to manage.
     * Required for entity retrieval operations.
     */
    entityName: Ref<string | null | undefined>;

    /**
     * The SQL SELECT clause for data retrieval (e.g., "*", "general__position, general__rotation").
     * Specifies which properties are fetched from the database. Defaults to "*".
     */
    selectClause?: string;

    /**
     * Parameters to use with the selectClause in the query.
     * Empty by default.
     */
    selectParams?: unknown[];

    /**
     * The SQL INSERT clause for entity creation, appended after "INSERT INTO entity.entities".
     * Example: "(general__entity_name, general__position) VALUES ($1, $2) RETURNING general__entity_name"
     * Include "RETURNING general__entity_name" to get the created entity's name back.
     */
    insertClause?: string;

    /**
     * Parameters to use with the insertClause when creating a new entity.
     * The first parameter should be the entity name (string).
     */
    insertParams?: unknown[];

    /**
     * Vircadia instance to use for database operations.
     * If not provided, will be injected from the component context.
     */
    instance?: I_VircadiaInstance_Vue;

    /**
     * Zod schema for validating and typing the entity's meta__data.
     * When provided, meta__data will be parsed and validated during retrieval.
     */
    metaDataSchema?: MetaSchema;

    /**
     * Default values for meta__data when validation fails.
     * Used as a fallback when meta__data parsing encounters an error.
     */
    defaultMetaData?: z.infer<MetaSchema>;
}) {
    const {
        entityName,
        selectClause = "*",
        selectParams = [],
        insertClause: createInsertClause = "",
        insertParams: createInsertParams = [],
    } = options;

    // Database constants
    const TABLE_NAME = "entity.entities";
    const NAME_COLUMN = "general__entity_name";

    /**
     * Custom type that replaces the standard meta__data with a typed version
     * based on the provided Zod schema.
     */
    type EntityWithTypedMeta = Omit<Entity.I_Entity, "meta__data"> & {
        meta__data: z.infer<MetaSchema> | null;
    };

    // State refs
    const entityData = shallowRef<EntityWithTypedMeta | null>(null);
    const retrieving = ref(false);
    const updating = ref(false);
    const creating = ref(false);
    const error = ref<Error | null>(null);

    // Get the Vircadia instance
    const vircadia = options.instance || inject(getVircadiaInstanceKey_Vue());

    if (!vircadia) {
        throw new Error(
            "Vircadia instance not found. Either provide an instance in options or ensure this composable is used within a component with a provided Vircadia instance.",
        );
    }

    let isUnmounted = false;

    /**
     * Parses and validates raw meta__data using the provided Zod schema.
     * Returns typed meta__data or null if parsing fails.
     *
     * @param rawData - Raw meta__data from the database (string or object)
     * @returns Typed meta__data object or null if validation fails
     */
    const parseMetaData = (
        rawData: string | object | null,
    ): z.infer<MetaSchema> | null => {
        if (!rawData || !options.metaDataSchema) return null;

        try {
            const data =
                typeof rawData === "string" ? JSON.parse(rawData) : rawData;
            return options.metaDataSchema.parse(data);
        } catch (error) {
            console.warn("Meta data validation failed:", error);
            return options.defaultMetaData || null;
        }
    };

    /**
     * Creates a new entity in the database using the provided insert clause and parameters.
     *
     * @returns Promise resolving to the entity name if successful, or null if creation failed
     */
    const executeCreate = async (): Promise<string | null> => {
        // Prevent create if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "executeCreate skipped: Another operation (retrieve, create, update) is already in progress.",
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

    /**
     * Retrieves the entity from the database using the current entityName.
     * Parses meta__data according to the provided schema.
     *
     * @returns Promise that resolves when the retrieval operation completes
     */
    const executeRetrieve = async () => {
        // Prevent fetch if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "executeRetrieve skipped: Another operation (retrieve, create, update) is already in progress.",
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
                "executeRetrieve skipped: entityName is not provided.",
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
                const rawData = queryResult.result[0];
                const rawMetaData = rawData.meta__data;

                // Create enhanced entity with parsed meta__data
                const enhancedEntity: EntityWithTypedMeta = {
                    ...rawData,
                    meta__data: parseMetaData(rawMetaData), // Parse meta__data based on schema
                };

                // Deep compare new data with the raw existing data before assigning
                if (
                    !entityData.value ||
                    !isEqual(toRaw(entityData.value), enhancedEntity)
                ) {
                    entityData.value = enhancedEntity; // Assign enhanced entity with parsed meta__data
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

    /**
     * Updates the entity in the database using the provided SET clause and parameters.
     * Uses the current entity name from entityData.
     *
     * @param setClause - SQL SET clause for the UPDATE statement (e.g., "meta__data = $1")
     * @param updateParams - Parameters to use with the setClause
     * @returns Promise that resolves when the update operation completes
     */
    const executeUpdate = async (
        setClause: string,
        updateParams: unknown[],
    ) => {
        // Prevent update if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "executeUpdate skipped: Another operation (retrieve, create, update) is already in progress.",
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
                "executeUpdate skipped: Entity name not available in local data. Ensure entity is loaded via executeRetrieve first.",
            );
            error.value = new Error(
                "Cannot update: Entity name not available.",
            );
            return;
        }

        if (!setClause.trim()) {
            console.warn("executeUpdate skipped: Empty SET clause provided.");
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

    /**
     * Cleanup function to prevent async operations from affecting state after unmount.
     * Should be called when the component using this composable is unmounted.
     */
    const cleanup = () => {
        console.log(`useVircadiaEntity cleanup called for ${entityName.value}`);
        isUnmounted = true; // Flag to prevent async operations from updating state after cleanup
    };

    return {
        /**
         * Reactive reference to the entity data with typed meta__data.
         * Will be null if the entity doesn't exist or hasn't been retrieved yet.
         */
        entityData: readonly(entityData),

        /**
         * Indicates whether a retrieve operation is in progress.
         */
        retrieving: readonly(retrieving),

        /**
         * Indicates whether an update operation is in progress.
         */
        updating: readonly(updating),

        /**
         * Indicates whether a create operation is in progress.
         */
        creating: readonly(creating),

        /**
         * Contains any error that occurred during the last operation.
         * Will be null if the last operation was successful.
         */
        error: readonly(error),

        /**
         * Retrieves the entity from the database using the current entityName.
         * Updates entityData with the result, including typed meta__data.
         */
        executeRetrieve,

        /**
         * Updates the entity in the database using the provided SET clause and parameters.
         * Requires that entityData has been populated via executeRetrieve first.
         */
        executeUpdate,

        /**
         * Creates a new entity in the database using the provided insert clause and parameters.
         * Returns the entity name if successful, or null if creation failed.
         */
        executeCreate,

        /**
         * Cleanup function to prevent async operations from affecting state after unmount.
         * Should be called when the component using this composable is unmounted.
         */
        cleanup,
    };
}
