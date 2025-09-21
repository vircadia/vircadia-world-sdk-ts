import { sign } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { Auth } from "../../../schema/src/vircadia.schema.general";
import { BunLogModule } from "./vircadia.common.bun.log.module";
import { serverConfiguration } from "../config/vircadia.server.config";
import { verify } from "jsonwebtoken";
import type { SQL } from "bun";
import type { Sql } from "postgres";

const LOG_PREFIX = "General Auth Service";

export class AclService {
    private readonly db: SQL;
    private readonly legacyDb: Sql | null;
    private readonly readableGroupsByAgent: Map<string, Set<string>> =
        new Map();

    constructor(args: { db: SQL; legacyDb?: Sql | null }) {
        this.db = args.db;
        this.legacyDb = args.legacyDb ?? null;
    }

    public async warmAgentAcl(agentId: string): Promise<void> {
        try {
            const rows = await this.db<[{ group__sync: string }]>`
                SELECT * FROM auth.get_readable_groups(${agentId}::uuid)
            `;
            const set = new Set<string>();
            for (const r of rows) {
                const group = (r as { group__sync: string } | null)?.group__sync;
                if (group) set.add(group);
            }
            this.readableGroupsByAgent.set(agentId, set);
        } catch (error) {
            BunLogModule({
                prefix: LOG_PREFIX,
                message: "Failed to warm agent ACL",
                error,
                debug: serverConfiguration.VRCA_SERVER_DEBUG,
                suppress: serverConfiguration.VRCA_SERVER_SUPPRESS,
                type: "error",
                data: { agentId },
            });
        }
    }

    public canRead(agentId: string, syncGroup: string): boolean {
        const set = this.readableGroupsByAgent.get(agentId);
        return !!set?.has(syncGroup);
    }

    public isWarmed(agentId: string): boolean {
        return this.readableGroupsByAgent.has(agentId);
    }

    public async startRoleChangeListener(): Promise<void> {
        if (!this.legacyDb) return;
        try {
            await this.legacyDb.listen(
                "auth_roles_changed",
                async (raw: string) => {
                    try {
                        const payload = JSON.parse(raw) as {
                            agentId?: string;
                        };
                        if (payload.agentId) {
                            await this.warmAgentAcl(payload.agentId);
                        }
                    } catch {
                        // ignore malformed payload
                    }
                },
            );
        } catch (error) {
            BunLogModule({
                prefix: LOG_PREFIX,
                message: "Failed to start auth_roles_changed listener",
                error,
                debug: serverConfiguration.VRCA_SERVER_DEBUG,
                suppress: serverConfiguration.VRCA_SERVER_SUPPRESS,
                type: "error",
            });
        }
    }
}

export async function createAnonymousUser(db: SQL): Promise<{
    agentId: string;
    sessionId: string;
    token: string;
}> {
    try {
        return await db.begin(async (tx) => {
            // Fetch JWT secret and default permissions for anon provider
            const [providerConfig] = await tx<
                [
                    {
                        provider__jwt_secret: string;
                        provider__default_permissions__can_read: boolean;
                        provider__default_permissions__can_insert: boolean;
                        provider__default_permissions__can_update: boolean;
                        provider__default_permissions__can_delete: boolean;
                    },
                ]
            >`
                SELECT provider__jwt_secret,
                       provider__default_permissions__can_read,
                       provider__default_permissions__can_insert,
                       provider__default_permissions__can_update,
                       provider__default_permissions__can_delete
                FROM auth.auth_providers
                WHERE provider__name = 'anon'
                  AND provider__enabled = true
            `;

            if (!providerConfig) {
                throw new Error(
                    "Anonymous provider not configured or disabled",
                );
            }
            const jwtSecret = providerConfig.provider__jwt_secret;

            const agentId = randomUUID();
            const username = `Anonymous-${agentId.substring(0, 8)}`;

            // Create agent profile for anonymous user
            await tx`
                INSERT INTO auth.agent_profiles (
                    general__agent_profile_id,
                    profile__username,
                    auth__email,
                    auth__is_admin,
                    auth__is_anon,
                    profile__last_seen_at
                ) VALUES (
                    ${agentId}::UUID,
                    ${username},
                    NULL,
                    false,
                    true,
                    NOW()
                )
            `;

            // Create a new session
            const sessionId = randomUUID();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour session for anonymous users

            // Create JWT token
            const jwt = sign(
                {
                    sessionId,
                    agentId,
                    provider: Auth.E_Provider.ANONYMOUS,
                },
                jwtSecret,
                {
                    expiresIn: "1h",
                },
            );

            // Store session in database
            await tx`
                INSERT INTO auth.agent_sessions (
                    general__session_id,
                    auth__agent_id,
                    auth__provider_name,
                    session__expires_at,
                    session__jwt,
                    session__is_active
                ) VALUES (
                    ${sessionId}::UUID,
                    ${agentId}::UUID,
                    'anon',
                    ${expiresAt},
                    ${jwt},
                    true
                )
            `;

            // TODO: Add this to config with groups and mix of the provider perms for each, so defaults are defined there from a JSON structure, use CLI to configure as needed.
            // Add sync group permissions for anonymous users to access public assets
            const publicGroups = [
                "public.REALTIME",
                "public.NORMAL",
                "public.BACKGROUND",
                "public.STATIC",
            ];

            for (const group of publicGroups) {
                await tx`
                    INSERT INTO auth.agent_sync_group_roles (
                        auth__agent_id,
                        group__sync,
                        permissions__can_read,
                        permissions__can_insert,
                        permissions__can_update,
                        permissions__can_delete
                    ) VALUES (
                        ${agentId}::UUID,
                        ${group},
                        ${providerConfig.provider__default_permissions__can_read},
                        ${providerConfig.provider__default_permissions__can_insert},
                        ${providerConfig.provider__default_permissions__can_update},
                        ${providerConfig.provider__default_permissions__can_delete}
                    )
                `;
            }

            return {
                agentId,
                sessionId,
                token: jwt,
            };
        });
    } catch (error) {
        BunLogModule({
            prefix: LOG_PREFIX,
            message: "Failed to create anonymous user",
            error,
            debug: serverConfiguration.VRCA_SERVER_DEBUG,
            suppress: serverConfiguration.VRCA_SERVER_SUPPRESS,
            type: "error",
        });
        throw error;
    }
}

export async function signOut(db: SQL, sessionId: string): Promise<void> {
    try {
        // Invalidate the session
        await db`
            UPDATE auth.agent_sessions
            SET session__is_active = false,
                general__updated_at = NOW()
            WHERE general__session_id = ${sessionId}::UUID
        `;

        BunLogModule({
            prefix: LOG_PREFIX,
            message: "User signed out successfully",
            debug: serverConfiguration.VRCA_SERVER_DEBUG,
            suppress: serverConfiguration.VRCA_SERVER_SUPPRESS,
            type: "debug",
            data: { sessionId },
        });
    } catch (error) {
        BunLogModule({
            prefix: LOG_PREFIX,
            message: "Failed to sign out user",
            error,
            debug: serverConfiguration.VRCA_SERVER_DEBUG,
            suppress: serverConfiguration.VRCA_SERVER_SUPPRESS,
            type: "error",
        });
        throw error;
    }
}

export async function validateJWT(data: { superUserSql: SQL; provider: string; token: string }): Promise<{
    agentId: string;
    sessionId: string;
    isValid: boolean;
    errorReason?: string;
}> {
    const { superUserSql, provider, token } = data;

    if (!superUserSql) {
        throw new Error("No database connection available");
    }

    try {
        if (!provider) {
            return {
                agentId: "",
                sessionId: "",
                isValid: false,
                errorReason: "Provider is not set.",
            };
        }

        // Check for empty or malformed token first
        if (!token || token.split(".").length !== 3) {
            return {
                agentId: "",
                sessionId: "",
                isValid: false,
                errorReason: "Token is empty or malformed.",
            };
        }

        // Fetch JWT secret for this provider
        const [providerConfig] = await superUserSql<
            [{ provider__jwt_secret: string }]
        >`
            SELECT provider__jwt_secret
            FROM auth.auth_providers
            WHERE provider__name = ${provider}
              AND provider__enabled = true
        `;

        if (!providerConfig) {
            return {
                agentId: "",
                sessionId: "",
                isValid: false,
                errorReason: `Provider '${provider}' not found or not enabled.`,
            };
        }

        const jwtSecret = providerConfig.provider__jwt_secret;

        try {
            const decoded = verify(token, jwtSecret) as {
                sessionId: string;
                agentId: string;
                exp?: number;
            };

            // Check for missing required fields
            if (!decoded.sessionId) {
                return {
                    agentId: decoded.agentId || "",
                    sessionId: "",
                    isValid: false,
                    errorReason: "Token is missing sessionId claim.",
                };
            }

            if (!decoded.agentId) {
                return {
                    agentId: "",
                    sessionId: decoded.sessionId || "",
                    isValid: false,
                    errorReason: "Token is missing agentId claim.",
                };
            }

            BunLogModule({
                message: "JWT validation result",
                debug: serverConfiguration.VRCA_SERVER_DEBUG,
                suppress: serverConfiguration.VRCA_SERVER_SUPPRESS,
                type: "debug",
                data: {
                    token,
                    decoded,
                },
            });

            return {
                agentId: decoded.agentId,
                sessionId: decoded.sessionId,
                isValid: true,
            };
        } catch (verifyError) {
            // Handle specific jsonwebtoken errors
            if (verifyError instanceof Error) {
                let errorReason: string;

                if (verifyError.name === "TokenExpiredError") {
                    errorReason = "Token has expired.";
                } else if (verifyError.name === "JsonWebTokenError") {
                    errorReason = `JWT error: ${verifyError.message}`;
                } else if (verifyError.name === "NotBeforeError") {
                    errorReason = "Token is not yet valid.";
                } else {
                    errorReason = `Token verification failed: ${verifyError.message}`;
                }

                return {
                    agentId: "",
                    sessionId: "",
                    isValid: false,
                    errorReason,
                };
            }

            return {
                agentId: "",
                sessionId: "",
                isValid: false,
                errorReason: "Unknown token verification error.",
            };
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        BunLogModule({
            message: `Internal JWT Session validation failed: ${errorMessage}`,
            debug: serverConfiguration.VRCA_SERVER_DEBUG,
            suppress: serverConfiguration.VRCA_SERVER_SUPPRESS,
            type: "debug",
            data: { error: errorMessage },
        });

        return {
            agentId: "",
            sessionId: "",
            isValid: false,
            errorReason: `Internal validation error: ${errorMessage}`,
        };
    }
}
