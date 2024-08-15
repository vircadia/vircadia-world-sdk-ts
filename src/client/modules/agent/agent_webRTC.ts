export namespace WebRTC {
    export const WEBRTC_LOG_PREFIX = '[WEBRTC]';

    // FIXME: These should be defined in config.
    const TEMP_ICE_SERVERS = [
        {
            urls: ['stun:stun.l.google.com:19302'],
        },
    ];

    export const createRTCConnection = (agentId: string): RTCPeerConnection => {
        const rtcConnection = new RTCPeerConnection({ iceServers: TEMP_ICE_SERVERS });
        return rtcConnection;
    };

    export const setupRTCEventListeners = (
        rtcConnection: RTCPeerConnection,
        onIceCandidate: (candidate: RTCIceCandidate) => void,
        onTrack: (event: RTCTrackEvent) => void,
        onNegotiationNeeded: () => void
    ) => {
        rtcConnection.onicecandidate = (event) => {
            if (event.candidate) {
                onIceCandidate(event.candidate);
            }
        };

        rtcConnection.ontrack = onTrack;
        rtcConnection.onnegotiationneeded = onNegotiationNeeded;
    };

    export const createDataChannel = (rtcConnection: RTCPeerConnection, label: string): RTCDataChannel => rtcConnection.createDataChannel(label);

    export const setupDataChannelListeners = (
        dataChannel: RTCDataChannel,
        onOpen: () => void,
        onClose: () => void,
        onMessage: (event: MessageEvent) => void
    ) => {
        dataChannel.onopen = onOpen;
        dataChannel.onclose = onClose;
        dataChannel.onmessage = onMessage;
    };

    export const createOffer = async (rtcConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> => {
        const offer = await rtcConnection.createOffer();
        await rtcConnection.setLocalDescription(offer);
        return offer;
    };

    export const handleOffer = async (
        rtcConnection: RTCPeerConnection,
        offer: RTCSessionDescriptionInit
    ): Promise<RTCSessionDescriptionInit> => {
        await rtcConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await rtcConnection.createAnswer();
        await rtcConnection.setLocalDescription(answer);
        return answer;
    };

    export const handleAnswer = async (
        rtcConnection: RTCPeerConnection,
        answer: RTCSessionDescriptionInit
    ): Promise<void> => {
        await rtcConnection.setRemoteDescription(new RTCSessionDescription(answer));
    };

    export const handleIceCandidate = async (
        rtcConnection: RTCPeerConnection,
        candidate: RTCIceCandidateInit
    ): Promise<void> => {
        await rtcConnection.addIceCandidate(new RTCIceCandidate(candidate));
    };

    export const closeRTCConnection = (rtcConnection: RTCPeerConnection): void => {
        rtcConnection.close();
    };
}
