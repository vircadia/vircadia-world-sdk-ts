export enum EPacketType {
    Audio = 'AudioPacket',
}

export interface IAudioPacket {
    audioData: string | ArrayBuffer | null;
    audioPosition: {
        x: number | null;
        y: number | null;
        z: number | null;
    };
    audioOrientation: {
        x: number | null;
        y: number | null;
        z: number | null;
    };
    TEMP_senderId: string | null;
}
