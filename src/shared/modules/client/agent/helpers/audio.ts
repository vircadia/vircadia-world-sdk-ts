import { Primitive } from '../../../../meta.ts';

export namespace Audio {
    export const AGENT_AUDIO_LOG_PREFIX = '[AGENT AUDIO]';

    export const addIncomingAudioStream = (data: {
        audioContext: AudioContext;
        mediaStream: MediaStream;
        pannerOptions: PannerOptions;
    }): PannerNode => {
        const audioSource = data.audioContext.createMediaStreamSource(
            data.mediaStream,
        );

        const panner = data.audioContext.createPanner();
        Object.assign(panner, data.pannerOptions);

        audioSource.connect(panner);

        panner.connect(data.audioContext.destination);

        return panner;
    };

    export const createAudioContext = (): AudioContext => new AudioContext();

    export const resumeAudioContext = async (
        audioContext: AudioContext,
    ): Promise<void> => {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    };

    export const destroyAudioContext = async (
        audioContext: AudioContext,
    ): Promise<void> => {
        await audioContext.close();
    };

    export const createAudioMediaStream = async (data: {
        constraints?: MediaStreamConstraints;
    }): Promise<MediaStream> => {
        const mediaStream = await navigator.mediaDevices.getUserMedia(
            data.constraints,
        );

        return mediaStream;
    };

    export const updateAudioPannerPosition = (
        panner: PannerNode,
        audioContext: AudioContext,
        position: Primitive.I_Vector3,
        orientation: Primitive.I_Vector3,
    ): void => {
        panner.positionX.setValueAtTime(position.x, audioContext.currentTime);
        panner.positionY.setValueAtTime(position.y, audioContext.currentTime);
        panner.positionZ.setValueAtTime(position.z, audioContext.currentTime);

        panner.orientationX.setValueAtTime(
            orientation.x,
            audioContext.currentTime,
        );
        panner.orientationY.setValueAtTime(
            orientation.y,
            audioContext.currentTime,
        );
        panner.orientationZ.setValueAtTime(
            orientation.z,
            audioContext.currentTime,
        );
    };

    export const removeIncomingAudioStream = (panner: PannerNode): void => {
        panner.disconnect();
    };

    export const createAudioStreamFromFloat32AudioBuffer = (
        audioContext: AudioContext,
        audioBuffer: AudioBuffer,
    ): MediaStream => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.start();

        return destination.stream;
    };

    export const decodeAudioBufferFromArrayBuffer = async (
        audioContext: AudioContext,
        arrayBuffer: ArrayBuffer,
    ): Promise<AudioBuffer> => {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    };

    export const createAudioBufferFromFloat32Array = (
        audioContext: AudioContext,
        floatArray: Float32Array,
        sampleRate: number,
    ): AudioBuffer => {
        const audioBuffer = audioContext.createBuffer(
            1,
            floatArray.length,
            sampleRate,
        );
        audioBuffer.copyToChannel(floatArray, 0);
        return audioBuffer;
    };
}
