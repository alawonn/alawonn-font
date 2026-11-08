# Design

Alawonn is our official typeface, a display face that is circular, sculpted and cursive in feel, with a clear slant. It's drawn for headings, names, packaging, interface titles and short expressive lines. It isn't meant for paragraphs of body text.

## Character

- Letters are built from separate crescent-shaped strokes. Each one swells in the middle and thins toward its ends.
- Narrow open channels run between the strokes. They're part of every letter, figure and symbol.
- One end of a stroke is usually soft and round, and the other tapers without coming to a hard point. Where a shape would normally close, the open ends nearly meet.
- Everything leans at the same angle, 16 degrees, and the slant is drawn into the outlines. The font is still named Regular and doesn't declare an italic angle.
- There's one case. Capitals show as their lowercase letters at the same size. Names, acronyms and the start of a sentence won't look different from other words.
- No textures, shadows or ornaments. The shapes carry the style.

## Metrics

Units per em: 1000.

| Metric | Units |
| --- | ---: |
| Cap height (same as x-height) | 700 |
| x-height | 700 |
| Ascender (typo and hhea) | 1170 |
| Descender (typo and hhea) | -300 |
| Line gap | 0 |
| Windows ascent / descent | 1220 / 320 |

The ascender leaves room for accents on tall letters, so the default line height is 1.47. For tight headings set `line-height` yourself; 1.1 to 1.2 works for one or two lines.

Stroke ends may dip slightly below the baseline or rise above the x-height. That's part of the drawing, not an alignment error.

## Spacing and kerning

Side bearings are set by measuring the white space next to each letter across the x-height, on the slanted outlines, so round and straight letters look evenly spaced.

Kerning is class-based. Accented letters share their base letter's class, and capitals share their lowercase letter's class. Pairs are measured from the outline profiles of every letter, figure and common punctuation mark, then corrected wherever two shapes would touch.

## Figures

Figures are proportional by default. `font-variant-numeric: tabular-nums` switches to tabular figures 640 units wide, the same width as the math signs and the figure space.

## Accents

Accented letters are composed from a base letter and a combining mark, placed with `top`, `bottom` and `ogonek` anchors. The same anchors drive the `mark` and `mkmk` features, so any supported letter takes any of the 15 combining marks, and marks stack. `i` and `j`, and `I` and `J`, switch to dotless forms under a top mark. In Romanian and Moldovan text (`lang="ro"` or `lang="mo"`), Ş ş Ţ ţ display with a comma below. In Turkish and Azeri text (`lang="tr"` or `lang="az"`), I shows the dotless letter and İ shows i.

## Sizes

Alawonn is hinted with ttfautohint for Windows. It reads well from 32 px up. At 20 px the channels between strokes start to close and words get harder to read; use another face at that size or smaller.

## What it doesn't have

- Ligatures. The pieces are designed to sit next to each other without them.
- Separate capital shapes.
- Other styles. Alawonn Regular is the only style, and the CSS uses it for every weight.
- Scripts other than Latin.
