import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { VircadiaAsset, type VircadiaAssetHandle } from "./VircadiaAsset";
import * as THREE from "three";

interface VircadiaEntityProps {
    entityId: string;
    entityName: string;
    assetFileName?: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
}

export const VircadiaEntity: React.FC<VircadiaEntityProps> = ({
    entityId,
    entityName,
    assetFileName,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const assetRef = useRef<VircadiaAssetHandle>(null);

    const handleAssetLoad = (asset: THREE.Object3D) => {
        if (groupRef.current) {
            // Clear existing children
            while (groupRef.current.children.length) {
                groupRef.current.remove(groupRef.current.children[0]);
            }
            // Add the new asset
            groupRef.current.add(asset);
        }
    };

    return (
        <THREE.Group
            ref={groupRef}
            position={position}
            rotation={rotation}
            scale={scale}
            name={entityName}
            userData={{ entityId }}
        >
            {assetFileName && (
                <VircadiaAsset
                    ref={assetRef}
                    assetFileName={assetFileName}
                    onLoad={handleAssetLoad}
                    onError={(error) =>
                        console.error("Asset loading error:", error)
                    }
                />
            )}
        </Group>
    );
};
