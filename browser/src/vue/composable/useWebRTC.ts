import { ref, computed, onUnmounted, inject, reactive } from "vue";
import { z } from "zod";
import { type useVircadia, useVircadiaInstance } from "../provider/useVircadia";
import type { Entity } from "../../../../schema/src/vircadia.schema.general";

// Enhanced schema to support perfect negotiation
const signalingMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("offer"),
        sdp: z.string(),
        sessionId: z.string(),
        timestamp: z.number(),
    }),
    z.object({
        type: z.literal("answer"),
        sdp: z.string(),
        sessionId: z.string(),
        timestamp: z.number(),
    }),
    z.object({
        type: z.literal("ice-candidate"),
        candidate: z.string().nullable(),
        sdpMLineIndex: z.number().nullable(),
        sdpMid: z.string().nullable(),
        sessionId: z.string(),
        timestamp: z.number(),
    }),
    z.object({
        type: z.literal("session-end"),
        sessionId: z.string(),
        timestamp: z.number(),
    }),
]);

type SignalingMessage = z.infer<typeof signalingMessageSchema>;

/**
 * Composable for WebRTC perfect negotiation over Vircadia entities.
 * Implements the perfect negotiation pattern with session management.
 */
export function useWebRTC(options: {
    instance?: ReturnType<typeof useVircadia>;
    channelId: string; // Unique channel identifier for this connection
    localSessionId: string; // Required local session ID to use
}) {
    // Get the Vircadia instance
    const vircadia = options.instance || inject(useVircadiaInstance());

    if (!vircadia) {
        throw new Error(
            "Vircadia instance not found. Either provide an instance in options or ensure this composable is used within a component with a provided Vircadia instance.",
        );
    }

    // Use provided session ID
    const sessionId = ref(options.localSessionId);

    // Track remote session IDs to determine politeness
    const remoteSessionIds = ref(new Set<string>());

    // Compute politeness based on session ID comparison
    const isPolite = computed(() => {
        // If we don't know about any remote peers yet, assume we're polite
        if (remoteSessionIds.value.size === 0) return true;

        // We are polite if our session ID is lexicographically smaller than any remote session ID
        const sortedIds = [
            sessionId.value,
            ...Array.from(remoteSessionIds.value),
        ].sort();
        return sortedIds[0] === sessionId.value;
    });

    // State for perfect negotiation
    const state = reactive({
        makingOffer: false,
        ignoreOffer: false,
        isSettingRemoteAnswerPending: false,
    });

    // Message queue for incoming signaling messages
    const messageQueue = ref<SignalingMessage[]>([]);
    const lastProcessedTimestamp = ref(0);

    // Debug statistics
    const debugStats = reactive({
        messagesSent: 0,
        messagesReceived: 0,
        lastMessageTime: 0,
        entityStatus: "initializing" as
            | "initializing"
            | "created"
            | "retrieved"
            | "error",
        errorMessage: null as string | null,
    });

    // Cleanup registry
    const cleanupFunctions: Array<() => void> = [];
    let pollInterval: NodeJS.Timeout | null = null;

    onUnmounted(() => {
        // Send session end message
        sendSessionEnd();

        // Clear polling interval
        if (pollInterval) {
            clearInterval(pollInterval);
        }

        // Run all cleanup functions
        for (const fn of cleanupFunctions) {
            fn();
        }
    });

    // Entity name for the signaling channel
    const entityName = computed(() => {
        // Use shorter, more predictable names
        const channelHash =
            options.channelId.length > 32
                ? `${options.channelId.substring(0, 16)}-${options.channelId.substring(options.channelId.length - 16)}`
                : options.channelId;
        return `webrtc-${channelHash}`;
    });

    // Send session end message
    const sendSessionEnd = async () => {
        try {
            await sendMessage({
                type: "session-end" as const,
            } as Omit<SignalingMessage, "sessionId" | "timestamp">);
        } catch (err) {
            console.warn("Failed to send session end message:", err);
        }
    };

    // Initialize or retrieve the signaling entity
    const initializeSignaling = async () => {
        debugStats.entityStatus = "initializing";
        debugStats.errorMessage = null;

        try {
            // Try to retrieve existing entity
            const retrieveResult =
                await vircadia.client.Utilities.Connection.query<
                    Entity.I_Entity[]
                >({
                    query: "SELECT * FROM general__entity WHERE general__entity_name = $1",
                    parameters: [entityName.value],
                });

            if (
                Array.isArray(retrieveResult.result) &&
                retrieveResult.result.length > 0
            ) {
                debugStats.entityStatus = "retrieved";
                console.log(
                    `[WebRTC] Retrieved existing entity: ${entityName.value}`,
                );

                // If it exists, check for stale sessions and clean them up
                const entityData = retrieveResult.result[0];
                if (entityData.meta__data) {
                    console.info(
                        "entityData.meta__data",
                        entityData.meta__data,
                    );
                    const now = Date.now();
                    const metaData = entityData.meta__data;
                    const originalCount = metaData.messages?.value?.length || 0;
                    const cleanedMessages = (
                        metaData.messages?.value || []
                    ).filter(
                        (msg: SignalingMessage) => now - msg.timestamp < 60000, // Increased to 60 seconds
                    );

                    if (cleanedMessages.length !== originalCount) {
                        await vircadia.client.Utilities.Connection.query({
                            query: "UPDATE general__entity SET meta__data = $1 WHERE general__entity_name = $2",
                            parameters: [
                                JSON.stringify({
                                    messages: cleanedMessages,
                                    lastUpdate: now,
                                }),
                                entityName.value,
                            ],
                        });
                        console.log(
                            `[WebRTC] Cleaned ${originalCount - cleanedMessages.length} stale messages`,
                        );
                    }
                }
            } else {
                throw new Error("Entity not found");
            }
        } catch (err) {
            // Entity doesn't exist, create it
            console.log(
                `[WebRTC] Entity not found, attempting to create: ${entityName.value}`,
            );
            try {
                await vircadia.client.Utilities.Connection.query({
                    query: "INSERT INTO general__entity (general__entity_name, meta__data) VALUES ($1, $2)",
                    parameters: [
                        entityName.value,
                        JSON.stringify({
                            messages: [],
                            lastUpdate: Date.now(),
                        }),
                    ],
                });
                debugStats.entityStatus = "created";
                console.log(`[WebRTC] Created new entity: ${entityName.value}`);
            } catch (createErr) {
                // Check if error is due to entity already existing (race condition)
                if (
                    createErr instanceof Error &&
                    createErr.message.includes("duplicate key")
                ) {
                    console.log(
                        "[WebRTC] Entity already exists (race condition), retrieving instead",
                    );
                    try {
                        const retryResult =
                            await vircadia.client.Utilities.Connection.query({
                                query: "SELECT * FROM general__entity WHERE general__entity_name = $1",
                                parameters: [entityName.value],
                            });
                        if (
                            Array.isArray(retryResult.result) &&
                            retryResult.result.length > 0
                        ) {
                            debugStats.entityStatus = "retrieved";
                        } else {
                            throw new Error(
                                "Failed to retrieve after create conflict",
                            );
                        }
                    } catch (retrieveErr) {
                        debugStats.entityStatus = "error";
                        debugStats.errorMessage =
                            retrieveErr instanceof Error
                                ? retrieveErr.message
                                : "Failed to retrieve after create conflict";
                        throw retrieveErr;
                    }
                } else {
                    debugStats.entityStatus = "error";
                    debugStats.errorMessage =
                        createErr instanceof Error
                            ? createErr.message
                            : "Unknown error";
                    throw createErr;
                }
            }
        }

        // Start polling for messages
        startPolling();
    };

    // Send a signaling message
    const sendMessage = async (
        message: Omit<SignalingMessage, "sessionId" | "timestamp">,
    ) => {
        const fullMessage: SignalingMessage = {
            ...message,
            sessionId: sessionId.value,
            timestamp: Date.now(),
        } as SignalingMessage;

        try {
            // Get current messages
            const retrieveResult =
                await vircadia.client.Utilities.Connection.query({
                    query: "SELECT * FROM general__entity WHERE general__entity_name = $1",
                    parameters: [entityName.value],
                });

            let currentMessages: SignalingMessage[] = [];
            if (
                Array.isArray(retrieveResult.result) &&
                retrieveResult.result.length > 0
            ) {
                const entityData = retrieveResult.result[0];
                if (entityData.meta__data) {
                    const metaData = entityData.meta__data;
                    currentMessages = metaData.messages?.value || [];
                }
            }

            // Add new message and clean old ones
            const now = Date.now();
            const updatedMessages = [
                ...currentMessages.filter(
                    (msg: SignalingMessage) => now - msg.timestamp < 60000,
                ), // Increased to 60 seconds
                fullMessage,
            ];

            // Update entity
            await vircadia.client.Utilities.Connection.query({
                query: "UPDATE general__entity SET meta__data = $1 WHERE general__entity_name = $2",
                parameters: [
                    JSON.stringify({
                        messages: updatedMessages,
                        lastUpdate: now,
                    }),
                    entityName.value,
                ],
            });

            // Log message sent
            console.log(`[WebRTC] Sent ${message.type} message:`, {
                type: message.type,
                sessionId: sessionId.value,
                entityName: entityName.value,
                messageCount: updatedMessages.length,
            });

            // Update debug stats
            debugStats.messagesSent++;
            debugStats.lastMessageTime = now;
        } catch (err) {
            debugStats.errorMessage =
                err instanceof Error ? err.message : "Failed to send message";
            throw err;
        }
    };

    // Type-safe message sending functions
    const sendOffer = async (sdp: string) => {
        await sendMessage({
            type: "offer" as const,
            sdp,
        } as Omit<SignalingMessage, "sessionId" | "timestamp">);
    };

    const sendAnswer = async (sdp: string) => {
        await sendMessage({
            type: "answer" as const,
            sdp,
        } as Omit<SignalingMessage, "sessionId" | "timestamp">);
    };

    const sendIceCandidate = async (
        candidate: string | null,
        sdpMLineIndex: number | null,
        sdpMid: string | null,
    ) => {
        await sendMessage({
            type: "ice-candidate" as const,
            candidate,
            sdpMLineIndex,
            sdpMid,
        } as Omit<SignalingMessage, "sessionId" | "timestamp">);
    };

    // Start polling for messages
    const startPolling = () => {
        if (pollInterval) return;

        const poll = async () => {
            try {
                const retrieveResult =
                    await vircadia.client.Utilities.Connection.query({
                        query: "SELECT * FROM general__entity WHERE general__entity_name = $1",
                        parameters: [entityName.value],
                    });

                if (
                    Array.isArray(retrieveResult.result) &&
                    retrieveResult.result.length > 0
                ) {
                    const entityData = retrieveResult.result[0];
                    if (entityData.meta__data) {
                        const metaData = entityData.meta__data;
                        const messages = metaData.messages?.value || [];

                        // Filter messages: from other sessions, newer than last processed, and not too old
                        const now = Date.now();
                        const newMessages = messages.filter(
                            (msg: SignalingMessage) =>
                                msg.sessionId !== sessionId.value &&
                                msg.timestamp > lastProcessedTimestamp.value &&
                                now - msg.timestamp < 60000, // Increased to 60 seconds
                        );

                        if (newMessages.length > 0) {
                            messageQueue.value.push(...newMessages);
                            lastProcessedTimestamp.value = Math.max(
                                ...newMessages.map(
                                    (msg: SignalingMessage) => msg.timestamp,
                                ),
                            );

                            // Log messages received
                            console.log(
                                `[WebRTC] Received ${newMessages.length} messages:`,
                                {
                                    messages: newMessages.map(
                                        (msg: SignalingMessage) => ({
                                            type: msg.type,
                                            from: msg.sessionId,
                                            timestamp: msg.timestamp,
                                        }),
                                    ),
                                    entityName: entityName.value,
                                    localSessionId: sessionId.value,
                                },
                            );

                            // Update debug stats
                            debugStats.messagesReceived += newMessages.length;
                            debugStats.lastMessageTime = now;
                        }
                    }
                }
            } catch (err) {
                // Check if entity doesn't exist and try to recreate it
                if (err instanceof Error && err.message.includes("not found")) {
                    console.log(
                        `[WebRTC] Entity not found during polling, attempting to recreate: ${entityName.value}`,
                    );
                    try {
                        await vircadia.client.Utilities.Connection.query({
                            query: "INSERT INTO general__entity (general__entity_name, meta__data) VALUES ($1, $2)",
                            parameters: [
                                entityName.value,
                                JSON.stringify({
                                    messages: [],
                                    lastUpdate: Date.now(),
                                }),
                            ],
                        });
                        debugStats.entityStatus = "created";
                        console.log(
                            `[WebRTC] Recreated entity during polling: ${entityName.value}`,
                        );
                    } catch (createErr) {
                        // If creation fails (e.g., already exists), try to retrieve again
                        if (
                            createErr instanceof Error &&
                            createErr.message.includes("duplicate key")
                        ) {
                            try {
                                const retryResult =
                                    await vircadia.client.Utilities.Connection.query(
                                        {
                                            query: "SELECT * FROM general__entity WHERE general__entity_name = $1",
                                            parameters: [entityName.value],
                                        },
                                    );
                                if (
                                    Array.isArray(retryResult.result) &&
                                    retryResult.result.length > 0
                                ) {
                                    debugStats.entityStatus = "retrieved";
                                }
                            } catch (retrieveErr) {
                                debugStats.errorMessage =
                                    retrieveErr instanceof Error
                                        ? retrieveErr.message
                                        : "Failed to retrieve after recreate conflict";
                            }
                        } else {
                            debugStats.errorMessage =
                                createErr instanceof Error
                                    ? createErr.message
                                    : "Failed to recreate entity";
                        }
                    }
                } else {
                    debugStats.errorMessage =
                        err instanceof Error ? err.message : "Polling error";
                }
                // Don't throw here, just continue polling
            }
        };

        // Initial poll
        poll();

        // Set up interval - poll more frequently for better responsiveness
        pollInterval = setInterval(poll, 500); // Poll every 500ms instead of 1000ms
        cleanupFunctions.push(() => {
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        });
    };

    // Perfect negotiation handlers
    const setupPerfectNegotiation = (pc: RTCPeerConnection) => {
        // Handle negotiation needed
        pc.onnegotiationneeded = async () => {
            try {
                state.makingOffer = true;
                await pc.setLocalDescription();
                const localDesc = pc.localDescription;
                if (localDesc?.sdp) {
                    await sendOffer(localDesc.sdp);
                }
            } catch (err) {
                console.error("Failed to create offer:", err);
            } finally {
                state.makingOffer = false;
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = async ({ candidate }) => {
            if (candidate) {
                await sendIceCandidate(
                    JSON.stringify(candidate),
                    candidate.sdpMLineIndex,
                    candidate.sdpMid,
                );
            }
        };

        // Process incoming messages
        const processMessages = async () => {
            while (messageQueue.value.length > 0) {
                const message = messageQueue.value.shift();
                if (!message) continue;

                // Track remote session IDs for politeness determination
                if (message.sessionId !== sessionId.value) {
                    const wasPolite = isPolite.value;
                    remoteSessionIds.value.add(message.sessionId);

                    // Track politeness changes in debug stats
                    if (wasPolite !== isPolite.value) {
                        debugStats.lastMessageTime = Date.now();
                    }
                }

                try {
                    if (message.type === "offer" || message.type === "answer") {
                        const description = {
                            type: message.type,
                            sdp: message.sdp,
                        };

                        // Perfect negotiation collision handling
                        const readyForOffer =
                            !state.makingOffer &&
                            (pc.signalingState === "stable" ||
                                state.isSettingRemoteAnswerPending);
                        const offerCollision =
                            description.type === "offer" && !readyForOffer;

                        state.ignoreOffer = !isPolite.value && offerCollision;

                        if (offerCollision) {
                            // Offer collision detected - handled by perfect negotiation
                        }

                        if (state.ignoreOffer) {
                            continue;
                        }

                        state.isSettingRemoteAnswerPending =
                            description.type === "answer";
                        await pc.setRemoteDescription(description);
                        state.isSettingRemoteAnswerPending = false;

                        if (description.type === "offer") {
                            await pc.setLocalDescription();
                            const localDesc = pc.localDescription;
                            if (localDesc?.sdp) {
                                await sendAnswer(localDesc.sdp);
                            }
                        }
                    } else if (message.type === "ice-candidate") {
                        try {
                            const candidate = message.candidate
                                ? JSON.parse(message.candidate)
                                : null;

                            if (candidate) {
                                await pc.addIceCandidate(
                                    new RTCIceCandidate(candidate),
                                );
                            }
                        } catch (err) {
                            if (!state.ignoreOffer) {
                                throw err;
                            }
                        }
                    } else if (message.type === "session-end") {
                        // Handle remote session end - remove from tracking
                        remoteSessionIds.value.delete(message.sessionId);
                        pc.close();
                    }
                } catch (err) {
                    console.error("Error processing message:", err);
                }
            }
        };

        // Set up message processing interval
        const messageInterval = setInterval(processMessages, 100);
        cleanupFunctions.push(() => clearInterval(messageInterval));

        return {
            cleanup: () => {
                pc.onnegotiationneeded = null;
                pc.onicecandidate = null;
            },
        };
    };

    return {
        sessionId: computed(() => sessionId.value),
        isPolite: computed(() => isPolite.value),
        entityName: computed(() => entityName.value),
        debugStats: computed(() => debugStats),
        initializeSignaling,
        setupPerfectNegotiation,
        sendSessionEnd,
        messageQueue: computed(() => messageQueue.value),
        state: computed(() => state),
    };
}
