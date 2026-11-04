# Contributing

Thanks for helping with Alawonn. Bug reports, character requests, spacing and kerning fixes, and documentation changes are all welcome.

## Report a problem

[Open an issue](https://github.com/alawonn/alawonn-font/issues/new/choose). For rendering problems, say which app or browser, its version, the operating system and the text you typed. A screenshot helps a lot.

## Set up

You need Python 3.13 and Node.js 24.

```bash
git clone https://github.com/alawonn/alawonn-font.git
cd alawonn-font
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -e . --no-deps
npm ci
```

`requirements.txt` pins every tool. With those versions, the build is byte-identical on every machine.

## Where things are

| Path | What it is |
| --- | --- |
| `sources/Alawonn.designspace` | Entry point for the build. |
| `sources/Alawonn-Regular.ufo/` | The font: outlines, spacing, kerning, anchors and features. This is the only place to change the design. |
| `tools/charset.py` | The list of supported characters. |
| `tools/build.py` | Builds `dist/` and the SVGs in `specimen/`. |
| `tools/check.py` | Release checks: versions, deterministic build, OTS, FontBakery and the npm package. |
| `tests/` | Unit tests for the source and the built fonts. |
| `css/alawonn.css` | The stylesheet shipped in the npm package. |
| `demo/` | The demo site. |
| `tests/consumers/` | Builds the documented framework examples against the packed package. |

## Change the font

1. Edit the UFO in a font editor that reads UFO 3, such as [Fontra](https://fontra.xyz), [FontForge](https://fontforge.org) or RoboFont. Keep outlines as cubic curves with points on the extremes, contours counterclockwise, and no overlaps between pieces that should stay separate.
2. Adding a character? Add it to `tools/charset.py` first, then draw it. Accented letters are components: the base letter plus a combining mark, placed by the `top`, `bottom` and `ogonek` anchors.
3. Rebuild and test:

   ```bash
   npm run build
   npm test
   ```

4. Look at the result in the demo with `npm run demo`, at 20, 32, 48 and 72 pixels and larger, on light and dark backgrounds.
5. Commit the source change together with the rebuilt `dist/` and `specimen/` files. CI rebuilds from the source and fails if they differ.

## Pull requests

Keep each pull request to one change. In the description:

- list the characters you changed,
- show before and after screenshots at display size and at 32 px,
- say if spacing, kerning or metrics changed,
- list the commands you ran.

Don't commit virtual environments, `node_modules`, package tarballs, editor files or credentials.

## Versions

One version covers the npm package, the Python project and the font. `1.2.3` on npm is `Version 1.023` inside the font. `python tools/versions.py --check` tells you if anything disagrees. Maintainers handle releases; see [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Your own version of the font

Alawonn is under the [SIL Open Font License 1.1](OFL.txt), and "Alawonn" is a Reserved Font Name. If you change the font and share your changed version outside a pull request to this repository, give it a different name.
