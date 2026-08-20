import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* tools/build-preview.mjs sets PREVIEW_BUILD to get an IIFE bundle. Browsers
   refuse to load ES module scripts over file://, so the standalone review
   build has to be a classic script. The Xcode bundle is unaffected. */
const isPreview = process.env.PREVIEW_BUILD === "1";

export default defineConfig({
  base: isPreview ? "./" : "/tolu-harman/",
  build: isPreview
    ? {
        /* Separate outDir so a preview build can never be mistaken for the
           real bundle and copied into the Xcode project. */
        outDir: ".preview-dist",
        modulePreload: false,
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            format: "iife",
            inlineDynamicImports: true,
            entryFileNames: "assets/index-preview.js",
            assetFileNames: "assets/[name][extname]",
          },
        },
      }
    : {},
  plugins: [
    react(),
    {
      name: "ios-compatible-index",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          return html
            .replace('<script type="module" crossorigin', "<script defer")
            .replace('<link rel="stylesheet" crossorigin', '<link rel="stylesheet"');
        },
      },
    },
  ],
});
