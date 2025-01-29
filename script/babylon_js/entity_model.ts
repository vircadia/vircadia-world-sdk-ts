import type { Script } from "../../schema/schema.general";
import {
    type AbstractMesh,
    Quaternion,
    SceneLoader,
    Vector3,
} from "@babylonjs/core";

export function scriptFunction(context: Script.Babylon.I_Context) {
    const { Vircadia } = context;

    // Get initial metadata values
    const modelUrl = Vircadia.Entity.metadata.model_url;
    let position = JSON.parse(Vircadia.Entity.metadata.position);
    let rotation = JSON.parse(Vircadia.Entity.metadata.rotation);
    let scale = JSON.parse(Vircadia.Entity.metadata.scale);

    // Reference to hold our mesh
    let modelMesh: AbstractMesh | null = null;

    // Helper to update transform
    function updateTransform() {
        if (!modelMesh) return;

        // Update position
        modelMesh.position.set(position.x, position.y, position.z);

        // Update rotation (converting from quaternion)
        if (rotation.w !== undefined) {
            modelMesh.rotationQuaternion = new Quaternion(
                rotation.x,
                rotation.y,
                rotation.z,
                rotation.w,
            );
        } else {
            modelMesh.rotation = new Vector3(
                rotation.x,
                rotation.y,
                rotation.z,
            );
        }

        // Update scale
        modelMesh.scaling.set(scale.x, scale.y, scale.z);
    }

    // Load and setup the model
    async function setupModel() {
        try {
            // Import the model
            const result = await SceneLoader.ImportMeshAsync(
                "",
                modelUrl,
                "",
                Vircadia.Babylon.Scene,
            );

            // Get the root mesh
            modelMesh = result.meshes[0];

            // Apply initial transform
            updateTransform();

            // Optional: Enable shadows
            for (const mesh of result.meshes) {
                mesh.receiveShadows = true;
            }
        } catch (error) {
            console.error("Failed to load model:", error);
        }
    }

    // Register hooks
    Vircadia.Hook.onScriptMount = () => {
        setupModel();
    };

    Vircadia.Hook.onEntityUpdate = (entity) => {
        if (!entity.metadata) return;

        // Update transform data if changed
        if (entity.metadata.position) {
            position = JSON.parse(entity.metadata.position);
        }
        if (entity.metadata.rotation) {
            rotation = JSON.parse(entity.metadata.rotation);
        }
        if (entity.metadata.scale) {
            scale = JSON.parse(entity.metadata.scale);
        }

        // Apply updates
        updateTransform();
    };

    Vircadia.Hook.onScriptBeforeUnmount = () => {
        // Cleanup
        if (modelMesh) {
            modelMesh.dispose();
            modelMesh = null;
        }
    };
}
