#!/usr/bin/env node
// Builds every documented way of using alawonn-font in a clean project and
// checks that the font really loads in a browser.
//
//   node tests/consumers/run.mjs                      # test the packed tarball
//   node tests/consumers/run.mjs --registry 1.0.0     # test the published package
//   node tests/consumers/run.mjs --only next,nuxt     # run some fixtures
//   node tests/consumers/run.mjs --keep               # keep the temp projects
//
// Bun and Deno come from the `bun` and `deno` npm packages when they're not
// on PATH.

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const registryVersion = option("--registry");
const only = option("--only")?.split(",");
const keep = args.includes("--keep");

const work = mkdtempSync(join(process.env.CONSUMERS_DIR ?? tmpdir(), "alawonn-consumers-"));
const results = [];

function run(command, commandArgs, cwd, env = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1", ASTRO_TELEMETRY_DISABLED: "1", NUXT_TELEMETRY_DISABLED: "1", EXPO_NO_TELEMETRY: "1", ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(" ")} failed in ${cwd}\n${result.stdout.slice(-3000)}\n${result.stderr.slice(-3000)}`);
  }
  return result.stdout;
}

function tool(name) {
  const onPath = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" }).stdout.trim();
  if (onPath && spawnSync(onPath, ["--version"]).status === 0) return onPath;
  const dir = join(work, ".tools");
  if (!existsSync(join(dir, "node_modules/.bin", name))) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), "{}");
    run("npm", ["install", "--no-audit", "--no-fund", name], dir);
  }
  return join(dir, "node_modules/.bin", name);
}

function write(dir, files) {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

// ---------- the package under test ----------

let spec;
let packageFiles;
if (registryVersion) {
  spec = `alawonn-font@${registryVersion}`;
  const dir = join(work, "registry");
  mkdirSync(dir);
  run("npm", ["pack", spec], dir);
  packageFiles = join(dir, "extracted");
  mkdirSync(packageFiles);
  run("tar", ["-xzf", readdirSync(dir).find((f) => f.endsWith(".tgz")), "-C", packageFiles], dir);
} else {
  const out = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", work], ROOT));
  spec = join(work, out[0].filename);
  packageFiles = join(work, "extracted");
  mkdirSync(packageFiles);
  run("tar", ["-xzf", spec, "-C", packageFiles]);
}
const fontHash = sha256(join(packageFiles, "package/dist/Alawonn-Regular.woff2"));
const ttfHash = sha256(join(packageFiles, "package/dist/Alawonn-Regular.ttf"));
const dependency = registryVersion ?? `file:${spec}`;
console.log(`Testing ${spec}\nWork directory: ${work}\n`);

// ---------- browser check ----------

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".ttf": "font/ttf", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".png": "image/png", ".txt": "text/plain" };

function serve(dir) {
  const server = createServer((req, res) => {
    let path = join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
    if (!existsSync(path) && existsSync(`${path}.html`)) path = `${path}.html`;
    if (!existsSync(path)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
    createReadStream(path).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

let browser;
async function fontLoads(dir, selector = "h1") {
  if (!browser) {
    const { chromium } = await import(join(ROOT, "node_modules/playwright/index.mjs"));
    browser = await chromium.launch();
  }
  const server = await serve(dir);
  const page = await browser.newPage();
  const fontResponses = [];
  page.on("response", (response) => {
    if (/\.(woff2|ttf)$/.test(new URL(response.url()).pathname)) fontResponses.push(response.status());
  });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.fonts.check('48px "Alawonn"'), null, { timeout: 30_000 });
    const result = await page.evaluate((sel) => {
      const node = document.querySelector(sel);
      const families = [...document.fonts].filter((f) => f.family.replace(/["']/g, "") === "Alawonn").map((f) => f.status);
      const span = document.createElement("span");
      span.textContent = "alawonn";
      span.style.cssText = "font-size:100px;position:absolute;white-space:nowrap;font-family:monospace";
      document.body.append(span);
      const fallback = span.getBoundingClientRect().width;
      span.style.fontFamily = '"Alawonn", monospace';
      const real = span.getBoundingClientRect().width;
      return { text: node?.textContent, family: node && getComputedStyle(node).fontFamily, families, differs: Math.abs(real - fallback) > 20 };
    }, selector);
    if (!result.families.includes("loaded")) throw new Error(`font not loaded: ${JSON.stringify(result)}`);
    if (!result.differs) throw new Error("text renders the same as the fallback font");
    if (!/Alawonn/.test(result.family ?? "")) throw new Error(`${selector} uses ${result.family}`);
    if (fontResponses.length !== 1 || fontResponses[0] !== 200) throw new Error(`expected one font download, got ${JSON.stringify(fontResponses)}`);
    return result;
  } finally {
    await page.close();
    server.close();
  }
}

function emittedFonts(dir) {
  const files = walk(dir);
  const woff2 = files.filter((f) => f.endsWith(".woff2") && sha256(f) === fontHash);
  const css = files.filter((f) => f.endsWith(".css") || f.endsWith(".html") || f.endsWith(".js"));
  const referenced = woff2.filter((f) => {
    const name = f.split("/").pop();
    return css.some((c) => readFileSync(c, "utf8").includes(name));
  });
  return { woff2, referenced };
}

async function check(name, fn) {
  if (only && !only.includes(name)) return;
  const started = Date.now();
  process.stdout.write(`${name} ... `);
  try {
    const detail = await fn(join(work, name));
    results.push({ name, ok: true });
    console.log(`ok (${Math.round((Date.now() - started) / 1000)}s)${detail ? ` ${detail}` : ""}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log("FAILED");
    console.error(String(error.stack ?? error).slice(0, 6000));
  }
}

async function buildAndLoad(dir, outDir) {
  const { woff2, referenced } = emittedFonts(join(dir, outDir));
  if (woff2.length !== 1) throw new Error(`expected the WOFF2 once in ${outDir}, found ${woff2.length}`);
  if (referenced.length !== 1) throw new Error("the emitted WOFF2 isn't referenced by any CSS, HTML or JS");
  await fontLoads(join(dir, outDir));
  return relative(join(dir, outDir), woff2[0]);
}

const H1 = '<h1 style="font-family: &quot;Alawonn&quot;, cursive; font-size: 72px">alawonn</h1>';

// ---------- package managers ----------

function resolves(dir, runtime = "node") {
  const script = 'console.log(import.meta.resolve("alawonn-font"), import.meta.resolve("alawonn-font/woff2"), import.meta.resolve("alawonn-font/ttf"))';
  const commands = {
    node: ["node", ["--input-type=module", "-e", script]],
    yarn: ["yarn", ["node", "--input-type=module", "-e", script]],
    deno: [tool("deno"), ["eval", script]],
  };
  const out = run(...commands[runtime], dir);
  // Yarn 1 wraps the output in its own banner lines, so pick ours.
  const line = out.split("\n").find((l) => l.includes("alawonn.css")) ?? out;
  const [css, woff2, ttf] = line.trim().split(" ");
  if (!css.endsWith("/css/alawonn.css") || !woff2.endsWith("/dist/Alawonn-Regular.woff2") || !ttf.endsWith("/dist/Alawonn-Regular.ttf")) {
    throw new Error(`unexpected resolution: ${out}`);
  }
  return "exports resolve";
}

await check("npm", async (dir) => {
  write(dir, { "package.json": { name: "c-npm", private: true, type: "module" } });
  run("npm", ["install", "--no-audit", "--no-fund", registryVersion ? spec : spec], dir);
  return resolves(dir);
});

await check("pnpm", async (dir) => {
  write(dir, { "package.json": { name: "c-pnpm", private: true, type: "module" } });
  run("pnpm", ["add", registryVersion ? spec : spec], dir);
  return resolves(dir);
});

await check("yarn", async (dir) => {
  write(dir, { "package.json": { name: "c-yarn", private: true, type: "module" } });
  // Yarn's default Plug'n'Play install; `yarn node` resolves through it.
  run("yarn", ["add", registryVersion ? spec : `alawonn-font@file:${spec}`], dir, { YARN_ENABLE_IMMUTABLE_INSTALLS: "false" });
  return `${resolves(dir, "yarn")} (Yarn ${run("yarn", ["--version"], dir).trim()})`;
});

await check("bun", async (dir) => {
  write(dir, { "package.json": { name: "c-bun", private: true, type: "module" } });
  run(tool("bun"), ["add", registryVersion ? spec : spec], dir);
  return resolves(dir);
});

await check("deno", async (dir) => {
  // Deno reads npm packages from the registry, and runs Vite against them.
  write(dir, {
    "deno.json": { nodeModulesDir: "auto" },
    "index.html": `<!doctype html><html><head><meta charset="utf-8"><title>deno</title><script type="module" src="/main.js"></script></head><body>${H1}</body></html>`,
    "main.js": 'import "alawonn-font";\n',
  });
  const deno = tool("deno");
  if (registryVersion) {
    run(deno, ["add", `npm:${spec}`, "npm:vite@^8"], dir);
  } else {
    // Deno can't install a local tarball, so npm fills node_modules and
    // Deno runs against it.
    write(dir, {
      "deno.json": { nodeModulesDir: "manual" },
      "package.json": { name: "c-deno", private: true, type: "module", dependencies: { "alawonn-font": dependency }, devDependencies: { vite: "^8" } },
    });
    run("npm", ["install", "--no-audit", "--no-fund"], dir);
  }
  run(deno, ["run", "-A", "npm:vite", "build"], dir);
  const out = await buildAndLoad(dir, "dist");
  return `${resolves(dir, "deno")}, built with Vite under Deno (${out})`;
});

// ---------- web: plain HTML from node_modules ----------

await check("html", async (dir) => {
  write(dir, { "package.json": { name: "c-html", private: true } });
  run("npm", ["install", "--no-audit", "--no-fund", spec], dir);
  write(dir, {
    "index.html": `<!doctype html><html><head><meta charset="utf-8"><title>html</title><link rel="stylesheet" href="/node_modules/alawonn-font/css/alawonn.css"></head><body>${H1}</body></html>`,
  });
  await fontLoads(dir);
  return "stylesheet linked from node_modules";
});

// ---------- frameworks ----------

await check("react-vite", async (dir) => {
  write(dir, {
    "package.json": { name: "c-react", private: true, type: "module", scripts: { build: "vite build" }, dependencies: { "alawonn-font": dependency, react: "^19", "react-dom": "^19" }, devDependencies: { vite: "^8", "@vitejs/plugin-react": "^6" } },
    "vite.config.js": 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()] });\n',
    "index.html": '<!doctype html><html><head><meta charset="utf-8"><title>react</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>',
    "src/main.jsx": 'import "alawonn-font";\nimport woff2Url from "alawonn-font/woff2?url";\nimport { createRoot } from "react-dom/client";\n\ncreateRoot(document.getElementById("root")).render(<h1 data-font={woff2Url} style={{ fontFamily: \'"Alawonn", cursive\', fontSize: 72 }}>alawonn</h1>);\n',
  });
  run("npm", ["install", "--no-audit", "--no-fund"], dir);
  run("npm", ["run", "build"], dir);
  return buildAndLoad(dir, "dist");
});

await check("vue-vite", async (dir) => {
  write(dir, {
    "package.json": { name: "c-vue", private: true, type: "module", scripts: { build: "vite build" }, dependencies: { "alawonn-font": dependency, vue: "^3" }, devDependencies: { vite: "^8", "@vitejs/plugin-vue": "^6" } },
    "vite.config.js": 'import { defineConfig } from "vite";\nimport vue from "@vitejs/plugin-vue";\nexport default defineConfig({ plugins: [vue()] });\n',
    "index.html": '<!doctype html><html><head><meta charset="utf-8"><title>vue</title></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>',
    "src/main.js": 'import "alawonn-font";\nimport { createApp } from "vue";\nimport App from "./App.vue";\n\ncreateApp(App).mount("#app");\n',
    "src/App.vue": '<template>\n  <h1 class="title">alawonn</h1>\n</template>\n\n<style>\n.title { font-family: "Alawonn", cursive; font-size: 72px; }\n</style>\n',
  });
  run("npm", ["install", "--no-audit", "--no-fund"], dir);
  run("npm", ["run", "build"], dir);
  return buildAndLoad(dir, "dist");
});

await check("sveltekit", async (dir) => {
  write(dir, {
    "package.json": { name: "c-sveltekit", private: true, type: "module", scripts: { build: "vite build" }, dependencies: { "alawonn-font": dependency }, devDependencies: { "@sveltejs/kit": "^3", "@sveltejs/adapter-static": "^4", "@sveltejs/vite-plugin-svelte": "^7", svelte: "^5", vite: "^8" } },
    "vite.config.js": 'import adapter from "@sveltejs/adapter-static";\nimport { sveltekit } from "@sveltejs/kit/vite";\nimport { defineConfig } from "vite";\nexport default defineConfig({ plugins: [sveltekit({ adapter: adapter() })] });\n',
    "src/app.html": '<!doctype html>\n<html lang="en">\n  <head><meta charset="utf-8" />%sveltekit.head%</head>\n  <body><div style="display: contents">%sveltekit.body%</div></body>\n</html>\n',
    "src/routes/+layout.js": "export const prerender = true;\n",
    "src/routes/+layout.svelte": '<script>\n  import "alawonn-font";\n  let { children } = $props();\n</script>\n\n{@render children()}\n',
    "src/routes/+page.svelte": '<h1>alawonn</h1>\n\n<style>\n  h1 { font-family: "Alawonn", cursive; font-size: 72px; }\n</style>\n',
  });
  run("npm", ["install", "--no-audit", "--no-fund"], dir);
  run("npm", ["run", "build"], dir);
  return buildAndLoad(dir, "build");
});

await check("astro", async (dir) => {
  write(dir, {
    "package.json": { name: "c-astro", private: true, type: "module", scripts: { build: "astro build" }, dependencies: { "alawonn-font": dependency, astro: "^7" } },
    "astro.config.mjs": 'import { defineConfig } from "astro/config";\nexport default defineConfig({});\n',
    "src/layouts/Base.astro": '---\nimport "alawonn-font";\n---\n<html lang="en">\n  <head><meta charset="utf-8" /><title>astro</title></head>\n  <body><slot /></body>\n</html>\n',
    "src/pages/index.astro": '---\nimport Base from "../layouts/Base.astro";\n---\n<Base>\n  <h1>alawonn</h1>\n</Base>\n<style>\n  h1 { font-family: "Alawonn", cursive; font-size: 72px; }\n</style>\n',
  });
  run("npm", ["install", "--no-audit", "--no-fund"], dir);
  run("npm", ["run", "build"], dir);
  return buildAndLoad(dir, "dist");
});

await check("next", async (dir) => {
  write(dir, {
    "package.json": { name: "c-next", private: true, scripts: { build: "next build" }, dependencies: { "alawonn-font": dependency, next: "^16", react: "^19", "react-dom": "^19" }, devDependencies: { typescript: "^5", "@types/react": "^19", "@types/node": "^24" } },
    "next.config.mjs": "export default { output: \"export\" };\n",
    "tsconfig.json": { compilerOptions: { target: "ES2022", lib: ["dom", "es2022"], strict: true, module: "esnext", moduleResolution: "bundler", jsx: "react-jsx", noEmit: true, esModuleInterop: true, skipLibCheck: true, isolatedModules: true, plugins: [{ name: "next" }] }, include: ["**/*.ts", "**/*.tsx", "next-env.d.ts"], exclude: ["node_modules"] },
    "app/layout.tsx": 'import "alawonn-font";\nimport type { ReactNode } from "react";\n\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n',
    "app/page.tsx": 'export default function Page() {\n  return <h1 style={{ fontFamily: \'"Alawonn", cursive\', fontSize: 72 }}>alawonn</h1>;\n}\n',
  });
  run("npm", ["install", "--no-audit", "--no-fund"], dir);
  run("npm", ["run", "build"], dir);
  return buildAndLoad(dir, "out");
});

await check("nuxt", async (dir) => {
  write(dir, {
    "package.json": { name: "c-nuxt", private: true, type: "module", scripts: { generate: "nuxt generate" }, dependencies: { "alawonn-font": dependency, nuxt: "^4", vue: "^3" } },
    "nuxt.config.ts": 'export default defineNuxtConfig({\n  css: ["alawonn-font"],\n  devtools: { enabled: false },\n});\n',
    "app/app.vue": '<template>\n  <h1 class="title">alawonn</h1>\n</template>\n\n<style>\n.title { font-family: "Alawonn", cursive; font-size: 72px; }\n</style>\n',
  });
  run("npm", ["install", "--no-audit", "--no-fund"], dir);
  run("npm", ["run", "generate"], dir);
  return buildAndLoad(dir, ".output/public");
});

await check("expo", async (dir) => {
  write(dir, {
    "package.json": { name: "c-expo", private: true, main: "index.js", dependencies: { "alawonn-font": dependency, expo: "^58" } },
    "app.json": { expo: { name: "c-expo", slug: "c-expo", platforms: ["android", "ios", "web"] } },
    "index.js": 'import { registerRootComponent } from "expo";\nimport App from "./App";\n\nregisterRootComponent(App);\n',
    "App.js": 'import { useFonts } from "expo-font";\nimport { Text } from "react-native";\n\nexport default function App() {\n  const [loaded] = useFonts({ Alawonn: require("alawonn-font/dist/Alawonn-Regular.ttf") });\n  if (!loaded) return null;\n  return <Text role="heading" aria-level={1} style={{ fontFamily: "Alawonn", fontSize: 48 }}>alawonn</Text>;\n}\n',
  });
  run("npm", ["install", "--no-audit", "--no-fund"], dir);
  run("npx", ["expo", "install", "expo-font", "react", "react-dom", "react-native", "react-native-web", "@expo/metro-runtime"], dir);
  // Native bundle: the TTF must ship as an asset.
  run("npx", ["expo", "export", "--platform", "android", "--output-dir", "dist-android"], dir);
  const androidTtf = walk(join(dir, "dist-android")).filter((f) => sha256(f) === ttfHash);
  if (androidTtf.length !== 1) throw new Error(`expected the TTF once in the Android export, found ${androidTtf.length}`);
  // Web export: expo-font registers the TTF and the browser renders it.
  run("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist-web"], dir);
  const webTtf = walk(join(dir, "dist-web")).filter((f) => sha256(f) === ttfHash);
  if (webTtf.length !== 1) throw new Error(`expected the TTF once in the web export, found ${webTtf.length}`);
  await fontLoads(join(dir, "dist-web"), "[role=heading]");
  return "TTF bundled for Android and loaded on web";
});

await browser?.close();
if (!keep) rmSync(work, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
