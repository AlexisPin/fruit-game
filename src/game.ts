import { Application } from "pixi.js";
import { DebugRender } from "./debug";
import { createFruit, fruits, type Fruit } from "./fruits";
import type { World } from "@dimforge/rapier2d";

const app = new Application({
  backgroundColor: 0x1099bb,
  resizeTo: window,
  view: document.getElementById("game-canvas") as HTMLCanvasElement,
});

app.stage.scale.set(2);
app.stage.eventMode = "static";
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
  const eventQueue = new RAPIER.EventQueue(true);

  const context = {
    RAPIER,
    world,
    app,
  };

  const objects: Fruit[] = [];

  const objectMap = new Map<number, Fruit>();

  app.view.addEventListener!("pointerup", () => {
    const newFruit = createFruit(
      fruits[Math.floor(Math.random() * 4)],
      context
    );
    newFruit.rigidBody.setTranslation(
      { x: app.renderer.events.pointer.x, y: DROP_Y },
      true
    );
    objectMap.set(newFruit.rigidBody.collider(0).handle, newFruit);
    objects.push(newFruit);
  });

  app.ticker.add((delta) => {
    world.step(eventQueue);
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (!started) return;
      const a = objectMap.get(handle1);
      const b = objectMap.get(handle2);
      if (!a || !b || a.index !== b.index) return;
      const midpointX =
        (a.rigidBody.translation().x + b.rigidBody.translation().x) / 2;
      const midpointY =
        (a.rigidBody.translation().y + b.rigidBody.translation().y) / 2;
      const nextFruit = fruits[a.index + 1];
      if (!nextFruit) return;
      a.remove();
      b.remove();
      objects.splice(objects.indexOf(a), 1);
      objects.splice(objects.indexOf(b), 1);
      objectMap.delete(handle1);
      objectMap.delete(handle2);
      const newFruit = createFruit(nextFruit, context);
      newFruit.rigidBody.setTranslation({ x: midpointX, y: midpointY }, true);
      objectMap.set(newFruit.rigidBody.collider(0).handle, newFruit);
      objects.push(newFruit);
    });

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
