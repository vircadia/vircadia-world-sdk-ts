import { initTRPC } from '@trpc/server';
import { z } from 'zod';

//
// ROUTER
//

const t = initTRPC.create();

const publicProcedure = t.procedure;
const router = t.router;

const connectionRouter = router({
    offer: publicProcedure
        .input(z.object({ sdp: z.string() }))
        .mutation(async ({ input }) => {
            // Handle the SDP offer from the client and generate an SDP answer
            const answer = await handleOffer(input.sdp);
            return { sdp: answer };
        }),
    answer: publicProcedure
        .input(z.object({ sdp: z.string() }))
        .mutation(async ({ input }) => {
            // Handle the SDP answer from the client
            await handleAnswer(input.sdp);
            return { success: true };
        }),
    iceCandidate: publicProcedure
        .input(z.object({ candidate: z.string() }))
        .mutation(async ({ input }) => {
            // Handle the ICE candidate from the client
            await handleIceCandidate(input.candidate);
            return { success: true };
        }),
});

export const appRouter = router({
    connection: connectionRouter,
});

export type AppRouter = typeof appRouter;

//
// LOGIC
//

const peerConnections = new Map<string, RTCPeerConnection>();

async function handleOffer(sdp: string): Promise<string> {
    const peerConnection = new RTCPeerConnection();
    peerConnections.set('client-id', peerConnection); // Replace 'client-id' with a unique identifier for the client

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // Send the ICE candidate to the client
        }
    };

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription({ type: 'offer', sdp }),
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    return answer.sdp ?? '';
}

async function handleAnswer(sdp: string): Promise<void> {
    const peerConnection = peerConnections.get('client-id'); // Replace 'client-id' with the unique identifier for the client
    if (peerConnection) {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp }),
        );
    }
}

async function handleIceCandidate(candidate: string): Promise<void> {
    const peerConnection = peerConnections.get('client-id'); // Replace 'client-id' with the unique identifier for the client
    if (peerConnection) {
        await peerConnection.addIceCandidate(
            new RTCIceCandidate({ candidate }),
        );
    }
}
