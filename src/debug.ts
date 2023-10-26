import type { DebugRenderBuffers } from "@dimforge/rapier2d";
import { Graphics } from "pixi.js";

export class DebugRender extends Graphics {
    constructor() {
      super();
      this.zIndex = 10000;
      this.lineStyle(2, 0xff00ff,1);
    }
    debug(buffer : DebugRenderBuffers) {
      this.clear();
      this.lineStyle(2, 0x000000,1);
      for(let i = 0; i < buffer.vertices.length; i += 4) {
        this.moveTo(buffer.vertices[i], buffer.vertices[i + 1]);
        this.lineTo(buffer.vertices[i + 2], buffer.vertices[i + 3]);
      }
    }
  }