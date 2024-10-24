import { zod } from 'npm:zod'

function seedScript(context: any): void {
    const { scene, mesh, BABYLON } = context;

    console.info('Scene:', scene);
    console.info('Mesh:', mesh);
    console.info('BABYLON:', BABYLON);
    console.info('zod:', zod);
}

seedScript;