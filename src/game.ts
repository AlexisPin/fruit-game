import { Application } from "pixi.js";
import { DebugRender } from "./debug";
import { createFruit, fruits } from "./fruits";
import type { World } from "@dimforge/rapier2d";

const app = new Application({
  backgroundColor: 0x1099bb,
  resizeTo: window,
  view: document.getElementById("game-canvas") as HTMLCanvasElement,
});

app.stage.scale.set(2);
app.stage.eventMode = 'static'
app.stage.sortableChildren = true;

const debugRender = new DebugRender();
app.stage.addChild(debugRender);

function createWorld(RAPIER: typeof import("@dimforge/rapier2d")) {
  const world = new RAPIER.World({ x: 0.0, y: 98.1 * 2 });

  const offset = { x: 100, y: 50 };
  const ground = RAPIER.ColliderDesc.cuboid(313 / 2, 10);
  ground.translation = { x: 313 / 2 + offset.x, y: 351 + 10 + offset.y };
  world.createCollider(ground);

  const leftWall = RAPIER.ColliderDesc.cuboid(10, 351 / 2);
  leftWall.translation = { x: offset.x + 10, y: 351 / 2 + offset.y };
  world.createCollider(leftWall);

  const rightWall = RAPIER.ColliderDesc.cuboid(10, 351 / 2);
  rightWall.translation = { x: offset.x + 313 - 10, y: 351 / 2 + offset.y };
  world.createCollider(rightWall);
  return world;
}

export type Context = {
  RAPIER: typeof import("@dimforge/rapier2d");
  world: World;
  app: Application;
};

const DROP_Y = 50;

import("@dimforge/rapier2d").then(async (RAPIER) => {
  const world = createWorld(RAPIER);

  const context = {
    RAPIER,
    world,
    app,
  };

  const objects = await Promise.all(
    fruits.map((fruit) => createFruit(fruit, context))
  );

  let i = 0;
  for(const object of objects) {
    object.rigidBody.setTranslation({ x: i + 100, y: 200 },true);
    i += object.sprite.width;
  }

  app.ticker.add((delta) => {
    const x = app.renderer.events.pointer.x;
    world.step();

    for (const { sprite, rigidBody } of objects) {
      const position = rigidBody.translation();
      sprite.x = position.x;
      sprite.y = position.y;
      sprite.rotation = rigidBody.rotation();
    }
    debugRender.debug(world.debugRender());
  });
});

document.body.appendChild(app.view as any);
