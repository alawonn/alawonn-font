import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

// Resolve "alawonn-font" and its subpaths through the package's own exports
// map, so the demo loads exactly the files a consumer gets.
const alias = Object.entries(pkg.exports)
  .filter(([key]) => !key.includes("*") && key !== "./package.json")
  .map(([key, target]) => ({
    find: new RegExp(`^${pkg.name}${key === "." ? "" : key.slice(1)}(?=\\?|$)`),
    replacement: root + target.slice(2),
  }));

// Preload the hashed WOFF2 that the package CSS points at. The crossorigin
// attribute matches the CORS-mode font request, so it's one download.
function preloadFont() {
  return {
    name: "alawonn-preload-font",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const asset = Object.keys(ctx.bundle ?? {}).find((file) => /Alawonn-Regular-.*\.woff2$/.test(file));
        if (!asset) return html;
        return {
          html,
          tags: [
            {
              tag: "link",
              attrs: { rel: "preload", href: `${ctx.server ? "" : "/alawonn-font/"}${asset}`, as: "font", type: "font/woff2", crossorigin: "" },
              injectTo: "head-prepend",
            },
          ],
        };
      },
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/alawonn-font/",
  resolve: { alias },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [preloadFont()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    target: "es2022",
  },
  server: { port: 5181, strictPort: true },
  preview: { port: 5182, strictPort: true },
});
