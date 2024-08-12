import axios from 'axios';
import { Supabase } from './modules/supabase/supabase.js';
import {
    E_HTTPRequestPath,
    E_AgentChannel,
    I_REQUEST_ConfigAndStatusResponse,
} from '../routes/meta.js';
import { log } from '../modules/log.js';
import { Agent } from './modules/agent/agent.js';
import { Media } from './modules/agent/media.js';

// FIXME: These should be defined in config.
const TEMP_ICE_SERVERS = [
    {
        urls: ['stun:stun.l.google.com:19302'],
    },
];

const TEMP_AUDIO_METADATA_INTERVAL = 250;

export namespace Client {
    let serverConfigAndStatus: I_REQUEST_ConfigAndStatusResponse | null = null;

    let host: string | null = null;
    let port: number | null = null;

    export const worldConnected = () => Supabase.getSupabaseClient() !== null;

    export namespace Setup {
        let presenceUpdateInterval: ReturnType<typeof setInterval> | null = null;

        export const InitializeWorldModule = async (data: {
            host: string;
            port: number;
            agentId: string;
        }) => {
            // Retrieve the status.
            try {
                const response = await axios.get<I_REQUEST_ConfigAndStatusResponse>(
                    `${data.host}:${data.port}${E_HTTPRequestPath.CONFIG_AND_STATUS}`,
                );
                serverConfigAndStatus = response.data;
                log(`Server status: ${serverConfigAndStatus}`, 'info');
            } catch (error) {
                log(`Failed to retrieve server status: ${error}`, 'error');
            }

            if (Supabase.getSupabaseClient()) {
                log('Already connected to Supabase.', 'info');
                return;
            }

            host = data.host;
            port = data.port;

            // Initialize Supabase client
            if (serverConfigAndStatus && serverConfigAndStatus.API_URL) {
                const url = `${data.host}:${data.port}${serverConfigAndStatus.API_URL}`;
                const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
                Supabase.initializeSupabaseClient(url, key);

                try {
                    Supabase.connectRealtime();
                    log('Successfully connected to Supabase Realtime', 'info');

                    // Set up presence channel
                    const presenceChannel = Supabase.getSupabaseClient()?.channel(
                        E_AgentChannel.AGENT_METADATA,
                    );

                    // Subscribe to the channel first
                    presenceChannel?.subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            // Only track presence after successful subscription
                            await presenceChannel.track({
                                agent_id: data.agentId,
                                online_at: new Date().toISOString(),
                            });
                        }
                    });

                    // Set up broadcast channel for WebRTC signaling
                    Supabase.getSupabaseClient()
                        ?.channel(E_AgentChannel.SIGNALING_CHANNEL)
                        .on(
                            'broadcast',
                            { event: 'webrtc-signal' },
                            ({ payload }) => {
                                void Agent.WebRTC.handleWebRTCSignal(payload);
                            },
                        )
                        .subscribe();

                    log(
                        `Active subscriptions: ${Supabase.getActiveSubscriptions()}`,
                        'info',
                    );
                } catch (error) {
                    log(
                        `Failed to connect to Supabase Realtime: ${error}`,
                        'error',
                    );
                }
            }

            // Initialize Agent and Media modules
            Agent.initialize(data.agentId);
            Media.InitializeMediaModule();

            // Start presence update interval
            presenceUpdateInterval = setInterval(() => {
                void Agent.Self.updatePresence();
            }, TEMP_AUDIO_METADATA_INTERVAL);
        };
    }

    export const TEMP_updateMetadataLocally = (metadata: {
        position: { x: number; y: number; z: number };
        orientation: { x: number; y: number; z: number };
    }) => {
        Agent.Self.updatePosition(metadata.position);
        Agent.Self.updateOrientation(metadata.orientation);
        void Agent.Self.updatePresence();
    };
}
