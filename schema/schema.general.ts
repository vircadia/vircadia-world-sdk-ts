import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Scene } from "@babylonjs/core";

export namespace Script {
    export namespace Babylon {
        export interface I_Context {
            Vircadia: {
                WorldClient: SupabaseClient;
                WorldScene: Scene;
                Meta: {
                    isRunningOnClient: boolean;
                    isRunningOnWorld: boolean;
                };
            };
        }

        export interface I_Hooks {
            onBeforeUnmount: () => void;
        }
    }
}

export namespace Agent {
    // TODO: The following will be implemented in scripts in the world directly.
    // export namespace WebRTC {
    // 	export enum E_SignalType {
    // 		AGENT_Offer = "agent-agent-offer-packet",
    // 		AGENT_Answer = "agent-agent-answer-packet",
    // 		AGENT_ICE_Candidate = "agent-agent-ice-candidate-packet",
    // 	}
    // }
    // export namespace Audio {
    // 	export const DEFAULT_PANNER_OPTIONS: PannerOptions = {
    // 		panningModel: "HRTF",
    // 		distanceModel: "inverse",
    // 		refDistance: 1,
    // 		maxDistance: 10000,
    // 	};
    // }
    // const MetadataSchema = z.object({
    // 	agentId: z.string(),
    // 	position: Primitive.S_Vector3,
    // 	orientation: Primitive.S_Vector3,
    // 	lastUpdated: z.string(),
    // });
    // export class C_Presence {
    // 	agentId: string;
    // 	position: Primitive.C_Vector3;
    // 	orientation: Primitive.C_Vector3;
    // 	lastUpdated: string;
    // 	constructor(data: z.infer<typeof MetadataSchema>) {
    // 		this.agentId = data.agentId;
    // 		this.position = new Primitive.C_Vector3(
    // 			data.position.x,
    // 			data.position.y,
    // 			data.position.z,
    // 		);
    // 		this.orientation = new Primitive.C_Vector3(
    // 			data.orientation.x,
    // 			data.orientation.y,
    // 			data.orientation.z,
    // 		);
    // 		this.lastUpdated = data.lastUpdated;
    // 	}
    // 	static parse(obj: {
    // 		agentId: string | any;
    // 		position: { x: number; y: number; z: number } | any;
    // 		orientation: { x: number; y: number; z: number } | any;
    // 		lastUpdated: string | any;
    // 	}): C_Presence {
    // 		const parsedData = MetadataSchema.parse(obj);
    // 		return new C_Presence(parsedData);
    // 	}
    // }
}

export namespace Config {
    export const ENVIRONMENT_PREFIX = "VIRCADIA_WORLD";

    export enum E_ENVIRONMENT_PREFIX {
        SERVER = "SERVER",
        CLIENT = "CLIENT",
        AGENT = "AGENT",
    }

    export enum E_SERVER_CONFIG {
        DEBUG = `${ENVIRONMENT_PREFIX}_${E_ENVIRONMENT_PREFIX.SERVER}_DEBUG`,
        INTERNAL_SERVER_HOST = `${ENVIRONMENT_PREFIX}_${E_ENVIRONMENT_PREFIX.SERVER}_INTERNAL_SERVER_HOST`,
        INTERNAL_SERVER_PORT = `${ENVIRONMENT_PREFIX}_${E_ENVIRONMENT_PREFIX.SERVER}_INTERNAL_SERVER_PORT`,
        FORCE_RESTART_SUPABASE = `${ENVIRONMENT_PREFIX}_${E_ENVIRONMENT_PREFIX.SERVER}_FORCE_RESTART_SUPABASE`,
    }

    export enum E_SERVER_ARGUMENT {
        DEBUG = "debug",
        INTERNAL_SERVER_PORT = "internal-server-port",
        INTERNAL_SERVER_HOST = "internal-server-host",
        FORCE_RESTART_SUPABASE = "force-restart-supabase",
    }

    export enum E_AGENT_CONFIG {
        AGENT_DEBUG = `${ENVIRONMENT_PREFIX}_${E_ENVIRONMENT_PREFIX.AGENT}_DEBUG`,
        AGENT_DEFAULT_WORLD_HOST = `${ENVIRONMENT_PREFIX}_${E_ENVIRONMENT_PREFIX.AGENT}_DEFAULT_WORLD_HOST`,
        AGENT_USE_SERVICE_SCRIPT_BUNDLE = `${ENVIRONMENT_PREFIX}_${E_ENVIRONMENT_PREFIX.AGENT}_USE_SERVICE_SCRIPT_BUNDLE`,
    }
}

export namespace Server {
    export enum E_ProxySubdomain {
        SUPABASE_API = "supabase-api",
        SUPABASE_STORAGE = "supabase-storage",
        SUPABASE_GRAPHQL = "supabase-graphql",
        SUPABASE_INBUCKET = "supabase-inbucket",
        SUPABASE_STUDIO = "supabase-studio",
    }

    export enum E_SERVER_API_ROUTE {}

    export namespace API {
        export namespace Request {}

        export namespace Response {
            export const S_BASE = z.object({
                error: z.string().optional(),
                stack: z.string().optional(),
            });

            export type I_BASE = z.infer<typeof S_BASE>;
        }
    }
}
