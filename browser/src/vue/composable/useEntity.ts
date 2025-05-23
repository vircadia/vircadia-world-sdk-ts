import { ref, readonly, shallowRef, type Ref, toRaw, inject } from "vue"; // Removed watch, Import toRaw
import { type useVircadia, useVircadiaInstance } from "../provider/useVircadia";
import type { Entity } from "../../../../schema/src/index.schema"; // Import the Entity namespace
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
 * - Typed metadata via Zod schema validation, with fallback defaultMetaData on parse errors
 *
 * All database operations must be triggered manually through the returned functions.
 * The entityData returned will contain properly typed meta__data based on the provided schema,
 * or the provided defaultMetaData if validation fails.
 *
 * @template MetaSchema - Zod schema type used to validate and type the entity's meta__data
 * @param options - Configuration options for entity management, including defaultMetaData fallback values
 * @returns Object containing reactive refs for entity data, status flags, errors, and operation functions
 */
export function useEntity<MetaSchema extends z.ZodType = z.ZodAny>(options: {
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
    instance?: ReturnType<typeof useVircadia>;

    /**
     * Zod schema for validating and typing the entity's meta__data.
     * When provided, meta__data will be parsed and validated during retrieval.
     * If parsing fails, the provided defaultMetaData (if any) will be used instead.
     */
    metaDataSchema?: MetaSchema;

    /**
     * Default values for meta__data when validation or parsing fails.
     * Used as a fallback when meta__data parsing throws an error or raw data is invalid.
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
    const error: Ref<Error | null> = ref(null);

    // Get the Vircadia instance
    const vircadia = options.instance || inject(useVircadiaInstance());

    if (!vircadia) {
        throw new Error(
            "Vircadia instance not found. Either provide an instance in options or ensure this composable is used within a component with a provided Vircadia instance.",
        );
    }

    let isUnmounted = false;

    /**
     * Parses and validates raw meta__data using the provided Zod schema.
     * Returns parsed meta__data, uses defaultMetaData on validation failure, or null if no data or no schema.
     *
     * @param raw - Raw meta__data from the database (string or object)
     * @returns Parsed meta__data object, defaultMetaData on validation failure, or null
     */
    const parseMetaData = (
        raw: string | object | null,
    ): z.infer<MetaSchema> | object | null => {
        if (raw == null) {
            console.debug("parseMetaData: raw is null");
            return null;
        }
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;

        // if no schema, just hand back whatever you got
        if (!options.metaDataSchema) {
            console.debug("parseMetaData: no schema, returning raw data");
            return data;
        }

        try {
            return options.metaDataSchema.parse(data);
        } catch (err) {
            console.warn("parseMetaData: failed, using fallback:", err);
            // either defaultMetaData or the raw data, whichever makes more sense
            return options.defaultMetaData ?? data;
        }
    };

    /**
     * Creates a new entity in the database using the provided insert clause and parameters.
     *
     * @returns Promise<string | null> - Resolves to the entity name (from RETURNING clause or parameters) or null if creation failed
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
     * Updates entityData and error refs; parses meta__data according to the provided schema.
     *
     * @returns Promise<void> - Resolves when the retrieval operation completes
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
     * Requires that entityData has been populated via executeRetrieve first.
     *
     * @param setClause - SQL SET clause for the UPDATE statement (e.g., "meta__data = $1")
     * @param updateParams - Parameters to use with the setClause
     * @returns Promise<boolean> - Resolves to true if the update was successful, false otherwise
     */
    const executeUpdate = async (
        setClause: string,
        updateParams: unknown[],
    ): Promise<boolean> => {
        // Prevent update if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "executeUpdate skipped: Another operation (retrieve, create, update) is already in progress.",
            );
            error.value = new Error(
                "Update operation skipped: Another operation in progress.",
            );
            return false;
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
            return false;
        }

        if (!setClause.trim()) {
            console.warn("executeUpdate skipped: Empty SET clause provided.");
            error.value = new Error("Cannot update: Empty SET clause.");
            return false;
        }

        updating.value = true;
        error.value = null;

        const query = `UPDATE ${TABLE_NAME} SET ${setClause} WHERE ${NAME_COLUMN} = '${currentName}' RETURNING ${NAME_COLUMN}`;

        try {
            const result = await vircadia.client.Utilities.Connection.query<
                Pick<Entity.I_Entity, typeof NAME_COLUMN>[]
            >({
                query,
                parameters: updateParams,
                timeoutMs: 10000,
            });
            if (isUnmounted) return false;
            const rows = result.result || [];
            if (rows.length > 0) {
                error.value = null; // Clear error on success
                return true;
            }
            console.warn(`No rows updated for entity ${currentName}`);
            return false;
        } catch (err) {
            if (isUnmounted) return false;
            console.error(
                `Error executing update for entity ${currentName}:`,
                err,
            );
            error.value =
                err instanceof Error
                    ? err
                    : new Error("Failed to execute entity update");
            return false;
        } finally {
            if (!isUnmounted) {
                updating.value = false;
            }
        }
    };

    /**
     * Checks if the entity exists in the database.
     *
     * @returns Promise<boolean> - Resolves to true if the entity exists, false otherwise.
     */
    const exists = async (): Promise<boolean> => {
        // Prevent existence check if another operation is in progress
        if (retrieving.value || creating.value || updating.value) {
            console.warn(
                "exists skipped: Another operation (retrieve, create, update) is already in progress.",
            );
            error.value = new Error(
                "Exists operation skipped: Another operation in progress.",
            );
            return false;
        }

        // Get current value from name ref
        const currentEntityName = entityName.value;
        if (!currentEntityName) {
            console.warn("exists skipped: entityName is not provided.");
            error.value = new Error(
                "Exists operation skipped: No entity name provided.",
            );
            return false;
        }

        retrieving.value = true;
        error.value = null;

        try {
            const query = `SELECT 1 FROM ${TABLE_NAME} WHERE ${NAME_COLUMN} = '${currentEntityName}' LIMIT 1`;
            const result = await vircadia.client.Utilities.Connection.query<
                unknown[]
            >({
                query,
                parameters: [],
                timeoutMs: 10000,
            });

            if (isUnmounted) return false;

            return result.result && result.result.length > 0;
        } catch (err) {
            if (isUnmounted) return false;
            console.error(
                `Error checking existence of entity ${currentEntityName}:`,
                err,
            );
            error.value =
                err instanceof Error
                    ? err
                    : new Error("Failed to check entity existence");
            return false;
        } finally {
            if (!isUnmounted) {
                retrieving.value = false;
            }
        }
    };

    /**
     * Cleanup function to prevent async operations from affecting state after unmount.
     * Should be called when the component using this composable is unmounted.
     */
    const cleanup = () => {
        isUnmounted = true; // Flag to prevent async operations from updating state after cleanup
    };

    return {
        /**
         * Reactive reference to the entity data with typed meta__data or default values.
         * Will be null if the entity doesn't exist, hasn't been retrieved yet, or no schema provided.
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
         * Updates entityData with the result, including typed meta__data or default values.
         *
         * @returns Promise<void>
         */
        executeRetrieve,

        /**
         * Updates the entity in the database using the provided SET clause and parameters.
         * Requires that entityData has been populated via executeRetrieve first.
         *
         * @returns Promise<boolean>
         */
        executeUpdate,

        /**
         * Creates a new entity in the database using the provided insert clause and parameters.
         * @returns Promise<string | null>
         */
        executeCreate,

        /**
         * Checks if the entity exists in the database.
         * @returns Promise<boolean> - Indicates whether the entity exists.
         */
        exists,

        /**
         * Cleanup function to prevent async operations from affecting state after unmount.
         * Should be called when the component using this composable is unmounted.
         */
        cleanup,
    };
}
