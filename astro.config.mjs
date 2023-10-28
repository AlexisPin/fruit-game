import { defineConfig } from "astro/config";
import wasm from "vite-plugin-wasm";
import tailwind from "@astrojs/tailwind";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), svelte()],
  vite: {
    plugins: [wasm()]
  }
});