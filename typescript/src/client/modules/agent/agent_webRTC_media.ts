export namespace WebRTC_Media {
    const MEDIA_LOG_PREFIX = '[MEDIA]';

    export const createAudioContext = (): AudioContext => new AudioContext();

    export const resumeAudioContext = async (audioContext: AudioContext): Promise<void> => {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    };

    export const createLocalStream = async (constraints: MediaStreamConstraints): Promise<MediaStream> => navigator.mediaDevices.getUserMedia(constraints);

    export const addStreamToConnection = (rtcConnection: RTCPeerConnection, stream: MediaStream): void => {
        stream.getTracks().forEach((track) => {
            rtcConnection.addTrack(track, stream);
        });
    };

    export const createPanner = (context: AudioContext): PannerNode => {
        const panner = context.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;
        return panner;
    };

    export const setupIncomingAudio = (
        audioContext: AudioContext,
        stream: MediaStream,
        panner: PannerNode
    ): void => {
        const audioSource = audioContext.createMediaStreamSource(stream);
        audioSource.connect(panner);
        panner.connect(audioContext.destination);
    };

    export const updateAudioPosition = (
        panner: PannerNode,
        audioContext: AudioContext,
        position: { x: number; y: number; z: number },
        orientation: { x: number; y: number; z: number }
    ): void => {
        panner.positionX.setValueAtTime(position.x, audioContext.currentTime);
        panner.positionY.setValueAtTime(position.y, audioContext.currentTime);
        panner.positionZ.setValueAtTime(position.z, audioContext.currentTime);

        panner.orientationX.setValueAtTime(orientation.x, audioContext.currentTime);
        panner.orientationY.setValueAtTime(orientation.y, audioContext.currentTime);
        panner.orientationZ.setValueAtTime(orientation.z, audioContext.currentTime);
    };

    export const cleanupAudio = (panner: PannerNode): void => {
        panner.disconnect();
    };

    // New function to create MediaStream from AudioBuffer
    export const createStreamFromFloat32AudioBuffer = (audioContext: AudioContext, audioBuffer: AudioBuffer): MediaStream => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.start();

        return destination.stream;
    };

    // New function to fetch and decode audio file
    export const fetchAndDecodeAudio = async (audioContext: AudioContext, url: string): Promise<AudioBuffer> => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return audioContext.decodeAudioData(arrayBuffer);
    };

    // New function to create AudioBuffer from float array
    export const createAudioBufferFromFloat32Array = (
        audioContext: AudioContext,
        floatArray: Float32Array,
        sampleRate: number
    ): AudioBuffer => {
        const audioBuffer = audioContext.createBuffer(1, floatArray.length, sampleRate);
        audioBuffer.copyToChannel(floatArray, 0);
        return audioBuffer;
    };
}
