# Quality checks

What gets checked, how, and the results for the current release.

## Automated, on every push

| Check | Command | What it proves |
| --- | --- | --- |
| Source tests | `python -m unittest discover -s tests` | Every supported character is mapped once; contours are closed, clean and wound correctly; components are plain offsets; letters and marks have anchors; kerning points at real glyphs and groups. |
| Font tests | same | Names, version, metrics, `OS/2`, `head`, hinting tables and features are right; marks attach above and below, stack, and land on precomposed letters; `i` and `j` lose their dot under accents; Romanian uses comma below; tabular figures share one width; kerning applies; the WOFF2 decodes to the same outlines as the TTF. |
| Version sync | `python tools/versions.py --check` | `package.json`, `pyproject.toml`, the font's revision and unique ID, the CSS header, `FONTLOG.md` and the README's CDN links agree. |
| Deterministic build | `python tools/check.py` | Two builds in a row are byte-identical and match the committed `dist/`. CI also rebuilds from a clean checkout and fails on any difference. |
| OpenType Sanitizer | same | OTS 9.2 (the sanitizer in Chrome and Firefox) accepts the TTF and the WOFF2. |
| fontTools round trip | same | Every table decompiles and recompiles with fontTools 4.68. |
| FontBakery | same | Universal profile, FontBakery 1.1.0. |
| Package | same | The npm tarball holds exactly the expected 9 files, every export points at a packaged file, the CSS `url()` resolves inside the package, and `SHA256SUMS` matches. |
| Demo | `npm run demo:test` | Playwright in Chromium, Firefox, WebKit and a Pixel 7 profile: the hero is live text in the packaged font, the theme change runs through React Theme Tide, the phone menu opens, moves focus and closes, the tester and size control work, all 378 characters are listed and searchable, tabs work by keyboard, nothing scrolls sideways at 320 px, one font download, size budgets, axe (WCAG 2.2 AA) in light, dark and high-contrast modes, and visual snapshots of the specimens. |
| Framework examples | `npm run consumers` | Packs the tarball and builds each README example in a clean project, then loads the result in Chromium and checks the font is used: npm, pnpm, Yarn (Plug'n'Play), Bun, Deno, plain HTML, React with Vite, Vue with Vite, SvelteKit, Astro, Next.js App Router (static export), Nuxt, and Expo (Android bundle and web). |

## FontBakery result for 1.0.0

```text
FATAL 0 · ERROR 0 · FAIL 0 · WARN 1 · PASS 84
```

The one warning is `contour_count`, and it's intentional. Many Alawonn letters are drawn as separate sculpted pieces with open gaps between them, so their contour counts differ from typical fonts. `tools/check.py` allows this warning and fails on any other.

## Browsers and platforms checked for 1.0.0

| Where | How | Result |
| --- | --- | --- |
| Microsoft Edge 156, Windows 11 | Playwright driving the installed browser, demo at 1x and 2x, light, dark and forced colors | Font loads; specimens render at 20, 32, 48, 72 and 144 px. |
| Google Chrome 156, Windows 11 | Same | Same. |
| Chromium 156, Linux | Playwright test suite | All demo tests pass. |
| Firefox 157, Linux | Playwright test suite | All demo tests pass. |
| WebKit 27.2, Linux | Playwright test suite in GitHub Actions | All demo tests pass. |
| Windows 11 desktop | Per-user install of the TTF, then WPF and GDI+ | Registers as family "Alawonn", style "Regular", "Version 1.000", 390 glyphs, 378 characters, installable embedding. GDI+ renders it with ClearType at 20, 32, 48 and 72 px. |
| Linux desktop | `~/.local/share/fonts` and `fc-cache` | fontconfig lists `Alawonn:style=Regular` with the full character set. |

Not checked: Safari on macOS or iOS, and installation on macOS. If you try them, an issue with what you saw is welcome.

## Small sizes

The font is hinted with ttfautohint (hinting range 8 to 72 px). At 20 px on Windows the words stay readable and the sculpted pieces hold their shape. From 32 px up the separate pieces read clearly. Below 20 px the gaps between pieces close up, so Alawonn isn't recommended there.
