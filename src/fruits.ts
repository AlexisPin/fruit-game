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
];

const SCALE = 0.2;

export async function createFruit(
  def: (typeof fruits)[number],
  context: Context
) {
  const texture = BaseTexture.from(def.img);
  const sprite = Sprite.from(texture);
  sprite.scale.set(SCALE);
  sprite.anchor.set(def.origin[0], def.origin[1]);

  return new Promise<{
    sprite: Sprite;
    rigidBody: RigidBody;
  }>((resolve) => {
    texture.on("loaded", () => {
      const rigidBodyDesc =
        context.RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 0.0);
      const rigidBody = context.world.createRigidBody(rigidBodyDesc);

      const colliderDesc = context.RAPIER.ColliderDesc.ball(texture.width / 2 * SCALE);
      context.world.createCollider(colliderDesc, rigidBody).setTranslation({
        x: def.origin[0] * texture.width,
        y: def.origin[1] * texture.height,
      });
      rigidBody.addForce(new context.RAPIER.Vector2(3.0, 0.0), true);
      context.app.stage.addChild(sprite);

      resolve({ sprite, rigidBody });
    });
  });
}
