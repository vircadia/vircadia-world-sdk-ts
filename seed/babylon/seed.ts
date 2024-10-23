// import type { World } from "../../shared/modules/vircadia-world-meta/typescript/meta";

function seedScript(context: any): void {
    const { scene, mesh, BABYLON } = context;

    console.info('Scene:', scene);
    console.info('Mesh:', mesh);
    console.info('BABYLON:', BABYLON);
}

seedScript;