import { Script as ScriptHelper } from './script.js';
import { Audio as AudioHelper } from './audio.js';
import { WebRTC as WebRTCHelper } from './webrtc.js';
import { WebTransport as WebTransportHelper } from './webtransport.js';

export class Helpers {
    static readonly HELPER_LOG_PREFIX = '[HELPER]';

    static Script = ScriptHelper;
    static Audio = AudioHelper;
    static WebRTC = WebRTCHelper;
    static WebTransport = WebTransportHelper;
}
