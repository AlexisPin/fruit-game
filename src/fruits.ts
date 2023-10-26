import { BaseTexture, Sprite } from "pixi.js";
import type { Context } from "./game";
import type { RigidBody } from "@dimforge/rapier2d";

export const fruits = [
  {
    name: "Cherry",
    img: "cherry.png",
    origin: [0.5, 88 / 136],
  },
  {
    name: "Strawberry",
    img: "strawberry.png",
    origin: [0.5, 75 / 148],
  },
  {
    name: "Grape",
    img: "grape.png",
    origin: [0.5, 0.5],
  },
  {
    name: "Orange",
    img: "orange.png",
    origin: [0.5, 122 / 226],
  },
  {
    name: "Persimmon",
    img: "persimmon.png",
    origin: [0.5, 151.5 / 283],
  },
  {
    name: "Apple",
    img: "apple.png",
    origin: [170 / 341, 187 / 351],
  },
  {
    name: "Yuzu",
    img: "yuzu.png",
    origin: [0.5, 219 / 416],
  },
  {
    name: "Peach",
    img: "peach.png",
    origin: [0.5, 0.5],
  },
  {
    name: "Pineapple",
    img: "pineapple.png",
    origin: [0.5, 348 / 616],
  },
  {
    name: "Honeydew",
    img: "honeydew.png",
    origin: [0.5, 0.5],
  },
  {
    name: "Watermelon",
    img: "watermelon.png",
    origin: [0.5, 0.5],
  },
].map((fruit, index) => ({
  ...fruit,
  index,
  texture: BaseTexture.from(fruit.img),
}));

const SCALE = 0.2;

export type Fruit = {
  sprite: Sprite;
  rigidBody: RigidBody;
  name: string;
  index: number;
  remove: () => void;
};

export function createFruit(def: (typeof fruits)[number], context: Context) {
  const sprite = Sprite.from(def.texture);
  sprite.scale.set(SCALE);
  sprite.anchor.set(def.origin[0], def.origin[1]);

  const rigidBodyDesc = context.RAPIER.RigidBodyDesc.dynamic().setTranslation(
    0.0,
    0.0
  );
  const rigidBody = context.world.createRigidBody(rigidBodyDesc);

  const colliderDesc = context.RAPIER.ColliderDesc.ball(
    (def.texture.width / 2) * SCALE
  );
  const collider = context.world.createCollider(colliderDesc, rigidBody);
  collider.setTranslation({
    x: def.origin[0] * def.texture.width,
    y: def.origin[1] * def.texture.height,
  });
  collider.setActiveEvents(context.RAPIER.ActiveEvents.COLLISION_EVENTS);
  rigidBody.addForce(new context.RAPIER.Vector2(3.0, 0.0), true);
  context.app.stage.addChild(sprite);

  return {
    sprite,
    rigidBody,
    name: def.name,
    index: fruits.indexOf(def),
    remove: () => {
      context.world.removeRigidBody(rigidBody);
      context.app.stage.removeChild(sprite);
    },
  };
}
