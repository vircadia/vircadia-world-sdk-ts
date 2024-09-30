/// <reference lib="dom" />

import { FreeCamera } from "npm:@babylonjs/core/Cameras/freeCamera";
import { Engine } from "npm:@babylonjs/core/Engines/engine";
import { HemisphericLight } from "npm:@babylonjs/core/Lights/hemisphericLight";
import { Vector3 } from "npm:@babylonjs/core/Maths/math.vector";
import { Mesh } from "npm:@babylonjs/core/Meshes/mesh";
import { Scene } from "npm:@babylonjs/core/scene";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);

const engine = new Engine(canvas);
const scene = new Scene(engine);

const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), scene);
camera.setTarget(Vector3.Zero());
camera.attachControl(canvas, true);

const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);

const sphere = Mesh.CreateSphere("sphere1", 16, 2, scene);
sphere.position.y = 1;

engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => {
    engine.resize();
});
