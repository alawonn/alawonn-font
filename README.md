<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/alawonn/alawonn-font/main/specimen/wordmark-dark.svg">
    <img src="https://raw.githubusercontent.com/alawonn/alawonn-font/main/specimen/wordmark.svg" alt="Alawonn" width="440">
  </picture>
</p>

Alawonn is our official typeface, a circular, sculpted display face with a cursive feel. Use it for headings, names and short lines of display text.

[Live demo](https://alawonn.github.io/alawonn-font/) · [npm](https://www.npmjs.com/package/alawonn-font) · [Download](https://github.com/alawonn/alawonn-font/releases/latest) · [License (OFL 1.1)](https://github.com/alawonn/alawonn-font/blob/main/OFL.txt)

## Install

```bash
npm install alawonn-font
```

```bash
pnpm add alawonn-font
```

```bash
yarn add alawonn-font
```

```bash
bun add alawonn-font
```

```bash
deno add npm:alawonn-font
```

## Use it on a web page

Import the package once. It adds an `@font-face` rule for `"Alawonn"` and loads a 43 KB WOFF2 file.

```js
import "alawonn-font";
```

Then use the family wherever you want it:

```css
h1 {
  font-family: "Alawonn", cursive;
}
```

The rule covers every font weight, so a heading that's bold by default still uses the real outlines instead of a faked bold.

Need the font file itself, for a preload or your own `@font-face`? It's at `alawonn-font/woff2` (and `alawonn-font/ttf`). In Vite, importing it gives you the file's URL:

```js
import woff2Url from "alawonn-font/woff2?url";
```

## Frameworks

Every example below is built against the published package in a clean project.

| Framework | Where | What |
| --- | --- | --- |
| React with Vite | `src/main.jsx` | `import "alawonn-font";` |
| Vue with Vite | `src/main.js` | `import "alawonn-font";` |
| Svelte with SvelteKit | `src/routes/+layout.svelte` | `import "alawonn-font";` in the `<script>` block |
| Astro | your layout's frontmatter | `import "alawonn-font";` |
| Next.js (App Router) | `app/layout.tsx` | `import "alawonn-font";` |
| Nuxt | `nuxt.config.ts` | `css: ["alawonn-font"]` |

### React Native with Expo

React Native doesn't read CSS or WOFF2, so load the TTF with `expo-font`:

```bash
npx expo install expo-font
```

```jsx
import { useFonts } from "expo-font";
import { Text } from "react-native";

export default function App() {
  const [loaded] = useFonts({ Alawonn: require("alawonn-font/dist/Alawonn-Regular.ttf") });
  if (!loaded) return null;
  return <Text style={{ fontFamily: "Alawonn", fontSize: 48 }}>alawonn</Text>;
}
```

## CDN

No build step? Link the stylesheet from jsDelivr or UNPKG. Pin the version so your page never changes under you.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/alawonn-font@2.0.0/css/alawonn.css">
```

```html
<link rel="stylesheet" href="https://unpkg.com/alawonn-font@2.0.0/css/alawonn.css">
```

The stylesheet loads the WOFF2 from the same CDN and version.

## Desktop apps

Download `Alawonn-Regular.ttf` from the [latest release](https://github.com/alawonn/alawonn-font/releases/latest) and install it:

- Windows: right-click the file and choose **Install**.
- macOS: double-click the file and choose **Install** in Font Book.
- Linux: copy it to `~/.local/share/fonts`, then run `fc-cache -f`.

It shows up as **Alawonn** in your font menu. Each release also has a zip with the TTF, the WOFF2 and the license, plus SHA-256 checksums.

## Characters

378 characters, enough for English, French, Spanish, Portuguese, German, Italian, Dutch, the Nordic languages, Polish, Czech, Slovak, Hungarian, Romanian, Turkish, the Baltic languages, Maltese, Esperanto and Haitian Creole:

- Basic Latin, Latin-1 Supplement and Latin Extended-A, complete except the soft hyphen
- Windows-1252, complete
- Romanian comma-below letters (Ș ș Ț ț)
- Typographic quotes, dashes, guillemets, ellipsis, bullet, daggers and per mille
- Currency: $ ¢ £ ¤ ¥ € ƒ
- Math: + − × ÷ = ≠ < > ≤ ≥ ± ¬ ≈
- 15 combining accents that attach to any letter

OpenType features: kerning, mark positioning, dotless i and j under accents, Romanian comma-below (`lang="ro"`) and tabular figures (`font-variant-numeric: tabular-nums`).

Alawonn has one case. Capitals show as their lowercase letters at the same size, so `ALAWONN` and `alawonn` look the same. The text keeps its case for copying, search and screen readers.

See every character in the [demo](https://alawonn.github.io/alawonn-font/#characters).

## Contributing and license

Bug reports and pull requests are welcome. [CONTRIBUTING.md](https://github.com/alawonn/alawonn-font/blob/main/CONTRIBUTING.md) explains how to build the font and test a change.

Alawonn is free to use in any project, personal or commercial, under the [SIL Open Font License 1.1](https://github.com/alawonn/alawonn-font/blob/main/OFL.txt). "Alawonn" is a Reserved Font Name: if you change the font and share your version, give it a different name. The license covers the font, not the Alawonn name or trademarks; see [TRADEMARKS.md](https://github.com/alawonn/alawonn-font/blob/main/TRADEMARKS.md).
