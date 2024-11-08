import { z } from "zod";
import * as WorldTypes from "./database.types";

export import World = WorldTypes;

export namespace Primitive {
	export const S_Vector3 = z.object({
		x: z.number(),
		y: z.number(),
		z: z.number(),
	});

	export type I_Vector3 = z.infer<typeof S_Vector3>;

	export class C_Vector3 {
		public x: number;
		public y: number;
		public z: number;

		constructor(_x?: number, _y?: number, _z?: number) {
			this.x = _x ?? 0;
			this.y = _y ?? 0;
			this.z = _z ?? 0;
		}

		static parse(obj: {
			x: number | any;
			y: number | any;
			z: number | any;
		}): C_Vector3 {
			const parsedData = S_Vector3.parse(obj);
			return new C_Vector3(parsedData.x, parsedData.y, parsedData.z);
		}
	}

	export const S_Color3 = z.object({
		r: z.number(),
		g: z.number(),
		b: z.number(),
	});

	export type I_Color3 = z.infer<typeof S_Color3>;

	export class C_Color3 {
		public r: number;
		public g: number;
		public b: number;

		constructor(_r?: number, _g?: number, _b?: number) {
			this.r = _r ?? 0;
			this.g = _g ?? 0;
			this.b = _b ?? 0;
		}

		static parse(obj: {
			r: number | any;
			g: number | any;
			b: number | any;
		}): C_Color3 {
			const parsedData = S_Color3.parse(obj);
			return new C_Color3(parsedData.r, parsedData.g, parsedData.b);
		}
	}

	export const S_Color4 = z.object({
		r: z.number(),
		g: z.number(),
		b: z.number(),
		a: z.number(),
	});

	export type I_Color4 = z.infer<typeof S_Color4>;

	export class C_Color4 {
		public r: number;
		public g: number;
		public b: number;
		public a: number;

		constructor(_r?: number, _g?: number, _b?: number, _a?: number) {
			this.r = _r ?? 0;
			this.g = _g ?? 0;
			this.b = _b ?? 0;
			this.a = _a ?? 0;
		}

		static parse(obj: {
			r: number | any;
			g: number | any;
			b: number | any;
			a: number | any;
		}): C_Color4 {
			const parsedData = S_Color4.parse(obj);
			return new C_Color4(
				parsedData.r,
				parsedData.g,
				parsedData.b,
				parsedData.a,
			);
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
