import { z } from "zod";
import type postgres from "postgres";
import type { Scene } from "@babylonjs/core";

export namespace Script {
    export namespace Babylon {
        export interface I_Context extends Base.I_Context {
            Vircadia: Base.I_Context["Vircadia"] & {
                Babylon: {
                    Scene: Scene;
                };
            };
        }

        export interface I_Return extends Base.I_Return {}
    }

    export namespace Base {
        export interface I_Context {
            Vircadia: {
                Client: typeof postgres;
                Meta: {
                    isRunningOnClient: boolean;
                    isRunningOnWorld: boolean;
                };
                Hook: I_Hook;
                Performance: {
                    clientUpdateSyncMs: number;
                    clientKeyframeSyncMs: number;
                };
                [key: string]: any;
            };
        }

        export interface I_Return {
            scriptFunction: (context: I_Context) => unknown;
            hooks: I_Hook;
        }

        export interface I_Hook {
            onBeforeScriptUnmount?: () => void;
            onBeforeEntityUnmount?: () => void;
            onUpdate?: () => void;
            onFixedUpdate?: () => void;
            onMount?: () => void;
            onEntityUpdateSync?: (entity: Entity.I_EntityData) => void;
            onEntityKeyframeSync?: (entity: Entity.I_EntityData) => void;
        }
    }
}

export namespace Entity {
    export interface I_EntityData {
        [key: string]: any;
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
