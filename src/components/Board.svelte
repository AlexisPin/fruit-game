<script lang="ts" context="module">
  export type BoardContext = {
    RAPIER: typeof import("@dimforge/rapier2d");
    world: World;
    app: Application;
    fruits: Map<number, Fruit>;
  };
</script>

<script lang="ts">
  import { Application, RAD_TO_DEG } from "pixi.js";
  import { createEventDispatcher, onMount } from "svelte";
  import { DebugRenderer } from "./DebugRenderer";
  import RAPIER, { World } from "@dimforge/rapier2d";
  import { createWorld } from "./world";
  import { Fruit, FruitType } from "./Fruit";
  import type { BoardState } from "./ws";

  export let other = false;

  export function updateBoard(board: BoardState) {
    const world = RAPIER.World.restoreSnapshot(board.rapier_state);
    context = {
      RAPIER: context.RAPIER,
      app: context.app,
      world,
      fruits: new Map(),
    };
    Fruit.restoreFruits(board.fruit_data, world, context);
  }

  const dispatch = createEventDispatcher<{
    drop: BoardState;
  }>();

  const DEBUG = true;

  let context: BoardContext;
  let view: HTMLCanvasElement;
  let container: HTMLDivElement;

  onMount(() => {
    let world: World;
    let on_pointer_up: (event: PointerEvent) => void;
    const app = new Application({
      backgroundColor: 0x1099bb,
      resizeTo: container,
      view,
    });
    app.stage.scale.set(2);
    app.stage.eventMode = "static";

    import("@dimforge/rapier2d").then(async (RAPIER) => {
      world = createWorld(RAPIER);

      let debug_renderer: DebugRenderer;
      if (DEBUG) {
        app.stage.sortableChildren = true;
        debug_renderer = new DebugRenderer(world);
        app.stage.addChild(debug_renderer);
      }

      context = {
        RAPIER,
        world,
        app,
        fruits: new Map(),
      };

      /* Drop fruit */
      on_pointer_up = (e) => {
        if (e.button === 0) {
          const x = (e.clientX - view.offsetLeft) / app.stage.scale.x;
          Fruit.create(FruitType.Cherry, { x, y: 50 }, context);
        } else if (e.button === 2) {
          const rapier_state = world.takeSnapshot();
          const fruit_data = new Map(
            [...context.fruits.values()].map((fruit) => [
              fruit.handle,
              fruit.type,
            ])
          );

          dispatch("drop", {
            rapier_state,
            fruit_data,
          });
        }
      };

      if (!other) {
        view.addEventListener("pointerup", on_pointer_up);
      }

      const event_queue = new RAPIER.EventQueue(true);

      app.ticker.add(() => {
        world.step(event_queue);

        event_queue.drainCollisionEvents((handle1, handle2, started) => {
          if (!started) return;

          const fruit1 = context.fruits.get(handle1)!;
          const fruit2 = context.fruits.get(handle2)!;
          if (fruit1.type !== fruit2.type) return;

          const new_type = fruit1.next_fruit;
          if (new_type === null) return;

          const midpoint = fruit1.get_midpoint(fruit2);

          fruit1.destroy();
          fruit2.destroy();

          Fruit.create(new_type, midpoint, context);
        });

        for (const fruit of context.fruits.values()) {
          fruit.update();
        }

        if (DEBUG) {
          debug_renderer.update();
        }
      });
    });

    return () => {
      app.destroy();
      view.removeEventListener("pointerup", on_pointer_up);
      world.free();
    };
  });
</script>

<div class="flex-1 w-1/2" bind:this={container}>
  <canvas bind:this={view} class="w-full h-full" />
</div>
