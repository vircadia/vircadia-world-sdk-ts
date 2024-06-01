import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/router';

async function main() {
    const client = createTRPCClient<AppRouter>({
        links: [
            httpBatchLink({
                url: 'http://localhost:3000/trpc',
            }),
        ],
    });

    const peerConnection = new RTCPeerConnection();

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            await client.connection.iceCandidate.mutate({
                candidate: event.candidate.candidate,
            });
        }
    };

    // Create an offer and send it to the server
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const { sdp: answerSdp } = await client.connection.offer.mutate({
        sdp: offer.sdp ?? '',
    });

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription({ type: 'answer', sdp: answerSdp }),
    );

    // Handle incoming ICE candidates from the server
    // This part depends on how you receive ICE candidates from the server
    // For example, you might use WebSocket or another mechanism to receive them
}

void main();
