import { defineConfig } from "astro/config";
import wasm from "vite-plugin-wasm";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  vite: {
    plugins: [wasm()],
  },
});
