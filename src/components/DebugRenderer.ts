import type { World } from "@dimforge/rapier2d";
import { Graphics } from "pixi.js";

export class DebugRenderer extends Graphics {
  constructor(private world: World) {
    super();
    this.zIndex = 10000;
    this.lineStyle(2, 0xff00ff, 1);
  }
  update() {
    const buffer = this.world.debugRender();
    this.clear();
    this.lineStyle(1, 0x000000, 1);
    for (let i = 0; i < buffer.vertices.length; i += 4) {
      // const color_index = i * 2;
      // const r = Math.floor(buffer.colors[color_index] * 255);
      // const g = Math.floor(buffer.colors[color_index + 1] * 255);
      // const b = Math.floor(buffer.colors[color_index + 2] * 255);
      // const color = (r << 16) | (g << 8) | b;
      // this.lineStyle(1, color, 1);
      this.moveTo(buffer.vertices[i], buffer.vertices[i + 1]);
      this.lineTo(buffer.vertices[i + 2], buffer.vertices[i + 3]);
    }
  }
}
