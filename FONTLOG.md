# FONTLOG

This file records changes to the Alawonn typeface, as the SIL Open Font License recommends.

Alawonn is a circular, sculpted display typeface with a cursive feel. It's made for headings, names and short lines of display text. The font is released under the SIL Open Font License 1.1 with the Reserved Font Name "Alawonn". The source is a UFO in `sources/`, built with the tools in `tools/`.

## 2.0.0 (2026-11-08)

- New design. Letters, figures, symbols and marks share a 16 degree slant, crescent strokes that swell in the middle and soften or taper at the ends, and narrow open channels between the strokes.
- One case. Capitals show as their lowercase letters at the same size, so text looks the same however it's typed. The text itself keeps its case for copying, search and screen readers.
- In Turkish and Azeri text (`lang="tr"` or `lang="az"`), I shows the dotless letter.
- Spacing and class kerning redone for the new shapes.
- Widths changed, so text reflows compared with 1.x.

## 1.0.0 (2026-11-04)

- Alawonn Regular, one static style.
- 378 characters: Basic Latin, Latin-1 Supplement, Latin Extended-A, Windows-1252, Romanian comma-below letters, typographic quotes and dashes, currency and math signs, and 15 combining marks.
- OpenType features: `kern`, `mark`, `mkmk`, `ccmp` (dotless i and j under accents), `locl` (Romanian and Moldovan comma-below), `tnum` and `pnum`.
- Class-based kerning across letters, figures and punctuation.
- TrueType outlines with ttfautohint hinting, in TTF and WOFF2.

## Acknowledgements

- Design and production: Alawonn (https://alawonn.com).
- Built with fontTools, ufo2ft, ufoLib2, skia-pathops, ttfautohint and HarfBuzz.
