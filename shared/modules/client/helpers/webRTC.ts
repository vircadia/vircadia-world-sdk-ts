import { log } from '../../../../general/modules/log.ts';
import { Agent as AgentMeta } from '../../../../meta.ts';
import { Audio } from './audio.ts';

export namespace WebRTC {
    export const WEBRTC_LOG_PREFIX = '[WEBRTC]';

    // Helper functions
    export const createPeerConnection = (
        iceServers: RTCIceServer[],
    ): RTCPeerConnection => new RTCPeerConnection({ iceServers });

    export const createDataChannel = (
        peerConnection: RTCPeerConnection,
        label: string,
    ): RTCDataChannel => peerConnection.createDataChannel(label);

    export const createOffer = async (
        peerConnection: RTCPeerConnection,
    ): Promise<RTCSessionDescriptionInit> => {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        return offer;
    };

    export const handleOffer = async (
        peerConnection: RTCPeerConnection,
        offer: RTCSessionDescriptionInit,
    ): Promise<RTCSessionDescriptionInit> => {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer),
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        return answer;
    };

    export const handleAnswer = async (
        peerConnection: RTCPeerConnection,
        answer: RTCSessionDescriptionInit,
    ): Promise<void> => {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(answer),
        );
    };

    export const addIceCandidate = async (
        peerConnection: RTCPeerConnection,
        candidate: RTCIceCandidateInit,
    ): Promise<void> => {
        await peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate),
        );
    };

    export const handleDataChannelMessage = (
        agentId: string,
        event: MessageEvent,
    ) => {
        log({
            message:
                `${WebRTC.WEBRTC_LOG_PREFIX} Received message from agent ${agentId}: ${event.data}`,
            type: 'info',
        });
        // Implement your logic for handling different types of messages here
    };

    export const setupDataChannelListeners = (
        dataChannel: RTCDataChannel | null,
        onOpen: () => void,
        onClose: () => void,
        onMessage: (event: MessageEvent) => void,
    ) => {
        if (dataChannel) {
            dataChannel.onopen = onOpen;
            dataChannel.onclose = onClose;
            dataChannel.onmessage = onMessage;
        }
    };

    export const setOutgoingAudioStreamOnConnection = (data: {
        rtcConnection: RTCPeerConnection;
        outgoingAudioMediaStream: MediaStream;
    }) => {
        // Remove existing tracks
        const senders = data.rtcConnection.getSenders();
        senders.forEach((sender) => {
            data.rtcConnection.removeTrack(sender);
        });

        // Add new tracks
        data.outgoingAudioMediaStream.getTracks().forEach((track) => {
            data.rtcConnection.addTrack(track, data.outgoingAudioMediaStream);
        });
    };

    export const deinitConnection = (
        connection: AgentMeta.I_AgentPeerConnection,
    ) => {
        if (connection.incomingAudioMediaPanner) {
            Audio.removeIncomingAudioStream(
                connection.incomingAudioMediaPanner,
            );
        }
        if (connection.rtcDataChannel) {
            connection.rtcDataChannel.close();
        }
        if (connection.incomingAudioMediaStream) {
            connection.incomingAudioMediaStream.getTracks().forEach((
                track,
            ) => track.stop());
        }
        if (connection.rtcConnection) {
            connection.rtcConnection.close();
        }
    };
}
