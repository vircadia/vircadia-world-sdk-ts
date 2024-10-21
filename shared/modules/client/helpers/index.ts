import { Script as ScriptHelper } from './script.ts';
import { Audio as AudioHelper } from './audio.ts';
import { WebRTC as WebRTCHelper } from './webrtc.ts';
import { WebTransport as WebTransportHelper } from './webtransport.ts';

export class Helpers {
    static readonly HELPER_LOG_PREFIX = '[HELPER]';

    static Script = ScriptHelper;
    static Audio = AudioHelper;
    static WebRTC = WebRTCHelper;
    static WebTransport = WebTransportHelper;
}
