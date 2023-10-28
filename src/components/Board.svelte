<script lang="ts" context="module">
  export type BoardContext = {
    RAPIER: typeof import("@dimforge/rapier2d");
    world: World;
    app: Application;
    fruits: Map<number, Fruit>;
  };
</script>

<script lang="ts">
  import { Application } from "pixi.js";
  import { onMount } from "svelte";
  import { DebugRenderer } from "./DebugRenderer";
  import { World } from "@dimforge/rapier2d";
  import { createWorld } from "./world";
  import { Fruit, FruitType } from "./Fruit";

  const DEBUG = true;

  let view: HTMLCanvasElement;
  let container: HTMLDivElement;

  onMount(() => {
    let world: World;
    let on_pointer_up: (event: PointerEvent) => void;
    const app = new Application({
      backgroundColor: 0x1099bb,
      resizeTo: window,
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

      const context: BoardContext = {
        RAPIER,
        world,
        app,
        fruits: new Map(),
      };

      /* Drop fruit */
      on_pointer_up = (e) => {
        const x = app.renderer.events.pointer.x / app.stage.scale.x;
        new Fruit(FruitType.Cherry, { x, y: 50 }, context);
      };
      view.addEventListener("pointerup", on_pointer_up);

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

          new Fruit(new_type, midpoint, context);
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

<div class="flex-1" bind:this={container}>
  <canvas bind:this={view} class="w-full h-full" />
</div>
