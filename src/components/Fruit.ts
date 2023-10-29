import { BaseTexture, Sprite } from "pixi.js";
import type { BoardContext } from "./Board.svelte";
import type { RigidBody, Vector2, World } from "@dimforge/rapier2d";

export const enum FruitType {
  Cherry = 0,
  Strawberry = 1,
  Grape = 2,
  Orange = 3,
  Persimmon = 4,
  Apple = 5,
  Yuzu = 6,
  Peach = 7,
  Pineapple = 8,
  Honeydew = 9,
  Watermelon = 10,
}

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

export class Fruit {
  static restoreFruits(
    fruit_data: Map<number, FruitType>,
    world: World,
    context: BoardContext
  ) {
    context.fruits.clear();
    for (const [handle, type] of fruit_data) {
      const def = fruits[type];

      /* Sprite */
      const sprite = Sprite.from(def.texture);
      sprite.scale.set(Fruit.SCALE);
      sprite.anchor.set(...def.origin);
      context.app.stage.addChild(sprite);

      const collier = world.getCollider(handle);
      const rigidBody = collier.parent()!;

      const fruit = new Fruit(sprite,type, rigidBody, handle, context);

      context.fruits.set(handle, fruit);
      return fruit;
    }
  }

  static SCALE = 0.2;

  static create(
    type: FruitType,
    position: Vector2,
    context: BoardContext
  ): Fruit {
    const def = fruits[type];

    /* Sprite */
    const sprite = Sprite.from(def.texture);
    sprite.scale.set(Fruit.SCALE);
    sprite.anchor.set(...def.origin);
    context.app.stage.addChild(sprite);

    /* RigidBody */
    const rigidBody = context.world.createRigidBody(
      context.RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 0.0)
    );
    rigidBody.setTranslation(position, true);

    const collider = context.world.createCollider(
      context.RAPIER.ColliderDesc.ball((def.texture.width / 2) * Fruit.SCALE),
      rigidBody
    );
    collider.setTranslation({
      x: def.origin[0] * def.texture.width,
      y: def.origin[1] * def.texture.height,
    });
    collider.setActiveEvents(context.RAPIER.ActiveEvents.COLLISION_EVENTS);

    /* Fruit Map */
    const handle = collider.handle;

    const fruit = new Fruit(sprite,type, rigidBody, handle, context);
    context.fruits.set(handle, fruit);
    return fruit;
  }

  constructor(
    public sprite: Sprite,
    public type: FruitType,
    public rigidBody: RigidBody,
    public handle: number,
    public context: BoardContext
  ) {}

  get next_fruit() {
    if (this.type === FruitType.Watermelon) return null;
    return (this.type + 1) as FruitType;
  }

  get_midpoint(other: Fruit) {
    const { x: x1, y: y1 } = this.rigidBody.translation();
    const { x: x2, y: y2 } = other.rigidBody.translation();
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }

  update() {
    const { x, y } = this.rigidBody.translation();
    const rotation = this.rigidBody.rotation();
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.rotation = rotation;
  }

  destroy() {
    this.context.app.stage.removeChild(this.sprite);
    this.context.world.removeRigidBody(this.rigidBody);
    this.context.fruits.delete(this.handle);
  }
}
