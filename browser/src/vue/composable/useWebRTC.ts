import { ref, computed, onUnmounted, inject } from "vue";
import { useEntity } from "./useEntity";
import { z } from "zod";
import { type useVircadia, useVircadiaInstance } from "../provider/useVircadia";

// Zod schemas for offer and answer payloads
const offerSchema = z.object({
    type: z.literal("offer"),
    sdp: z.string(),
});

const answerSchema = z.object({
    type: z.literal("answer"),
    sdp: z.string(),
});

// Unified schema to accept either offer or answer, filter by type below
const sdpSchema = z.discriminatedUnion("type", [offerSchema, answerSchema]);

/**
 * Composable for WebRTC signaling over Vircadia entities.
 * Uses useEntity under the hood to create and poll entities carrying SDP payloads.
 */
export function useWebRTC(options: {
    instance?: ReturnType<typeof useVircadia>;
}) {
    // Get the Vircadia instance
    const vircadia = options.instance || inject(useVircadiaInstance());

    if (!vircadia) {
        throw new Error(
            "Vircadia instance not found. Either provide an instance in options or ensure this composable is used within a component with a provided Vircadia instance.",
        );
    }

    // Add a cleanup registry and register a single onUnmounted hook at setup
    const cleanupFunctions: Array<() => void> = [];

    onUnmounted(() => {
        for (const fn of cleanupFunctions) {
            fn();
        }
    });

    // Add helper to delete existing signaling entity
    const deleteEntity = async (entityId: string): Promise<void> => {
        try {
            await vircadia.client.Utilities.Connection.query({
                query: "DELETE FROM entity.entities WHERE general__entity_name = $1",
                parameters: [entityId],
                timeoutMs: 10000,
            });
        } catch (err) {
            console.warn(`Failed to delete existing entity ${entityId}:`, err);
        }
    };

    /**
     * Creates an offer entity with the given ID and local description.
     * @param offerId - Unique identifier for the signaling entity.
     * @param description - Local RTCPeerConnection offer description.
     */
    const createOffer = async (
        offerId: string,
        description: RTCSessionDescriptionInit,
    ): Promise<RTCSessionDescriptionInit> => {
        // Remove any existing entity with the same ID to reset state
        await deleteEntity(offerId);
        const entityName = ref(offerId);
        const offerEntity = useEntity({
            instance: vircadia,
            entityName,
            insertClause:
                "(general__entity_name, meta__data) VALUES ($1, $2) RETURNING general__entity_name",
            insertParams: [
                offerId,
                JSON.stringify({ type: "offer", sdp: description.sdp ?? "" }),
            ],
            metaDataSchema: offerSchema,
        });
        await offerEntity.executeCreate();
        return description;
    };

    /**
     * Polls for an incoming offer with the specified ID.
     * @param offerId - Identifier of the offer entity to watch.
     */
    const waitForOffer = (offerId: string) => {
        const entityName = ref(offerId);
        const offerEntity = useEntity({
            instance: vircadia,
            entityName,
            selectClause: "meta__data",
            metaDataSchema: sdpSchema,
        });
        // Initial fetch and periodic polling
        offerEntity.executeRetrieve();
        const interval = setInterval(() => {
            offerEntity.executeRetrieve();
        }, 2000);
        cleanupFunctions.push(() => {
            clearInterval(interval);
            offerEntity.cleanup();
        });
        const raw = computed(() => offerEntity.entityData.value?.meta__data);
        const offer = computed(() =>
            raw.value?.type === "offer" ? raw.value : null,
        );
        return {
            offer,
            retrieving: offerEntity.retrieving,
            error: offerEntity.error,
        };
    };

    /**
     * Sends an answer by updating the offer entity's meta__data field.
     * @param offerId - Identifier of the existing offer entity.
     * @param description - Local RTCPeerConnection answer description.
     */
    const createAnswer = async (
        offerId: string,
        description: RTCSessionDescriptionInit,
    ): Promise<RTCSessionDescriptionInit> => {
        const entityName = ref(offerId);
        const answerEntity = useEntity({
            instance: vircadia,
            entityName,
        });
        await answerEntity.executeRetrieve();
        await answerEntity.executeUpdate("meta__data = $1", [
            JSON.stringify({ type: "answer", sdp: description.sdp ?? "" }),
        ]);
        return description;
    };

    /**
     * Polls for an answer on the specified offer entity.
     * @param offerId - Identifier of the offer entity to watch for an answer.
     */
    const waitForAnswer = (offerId: string) => {
        const entityName = ref(offerId);
        const answerEntity = useEntity({
            instance: vircadia,
            entityName,
            selectClause: "meta__data",
            metaDataSchema: sdpSchema,
        });
        answerEntity.executeRetrieve();
        const interval = setInterval(() => {
            answerEntity.executeRetrieve();
        }, 2000);
        cleanupFunctions.push(() => {
            clearInterval(interval);
            answerEntity.cleanup();
        });
        const raw = computed(() => answerEntity.entityData.value?.meta__data);
        const answer = computed(() =>
            raw.value?.type === "answer" ? raw.value : null,
        );
        return {
            answer,
            retrieving: answerEntity.retrieving,
            error: answerEntity.error,
        };
    };

    return {
        createOffer,
        waitForOffer,
        createAnswer,
        waitForAnswer,
    };
}
