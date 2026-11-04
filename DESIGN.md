# Design

Alawonn is a display typeface: circular, sculpted and cursive in feel, but upright. It's drawn for headings, names, packaging, interface titles and short expressive lines. It isn't meant for paragraphs of body text.

## Character

- Letters are built from round, sculpted strokes. Bowls and shoulders are broad, and many letters are made of separate pieces with small, deliberate gaps between them.
- Stroke ends taper to a point, like a brush lifting off the page.
- The core lowercase forms (`a`, `l`, `w`, `o`, `n`) are heavy and full. The rest of the alphabet uses the same round construction with a lighter, tapered stroke. That contrast gives words a varied, hand-made rhythm.
- The rhythm is upright. There's no italic slant, and repeated letters are always identical.
- No textures, shadows or ornaments. The shapes carry the style.

## Metrics

Units per em: 1000.

| Metric | Units |
| --- | ---: |
| Cap height | 880 |
| x-height | 700 |
| Ascender (typo and hhea) | 1170 |
| Descender (typo and hhea) | -300 |
| Line gap | 0 |
| Windows ascent / descent | 1220 / 320 |

The ascender leaves room for accents on capitals, so the default line height is 1.47. For tight headings set `line-height` yourself; 1.1 to 1.2 works for one or two lines.

Strokes that end in a brush taper may dip slightly below the baseline or rise above the cap height. That's part of the drawing, not an alignment error.

## Spacing and kerning

Side bearings are set by measuring the white space next to each letter across the x-height (lowercase), cap height (capitals) or figure height (figures), so round and straight letters look evenly spaced. The heavy `o` sets the lowercase rhythm.

Kerning is class-based. Accented letters share their base letter's class. Pairs are measured from the outline profiles of every letter, figure and common punctuation mark, then corrected wherever two shapes would touch.

## Figures

Figures are proportional by default. `font-variant-numeric: tabular-nums` switches to tabular figures 640 units wide, the same width as the math signs and the figure space.

## Accents

Accented letters are composed from a base letter and a combining mark, placed with `top`, `bottom` and `ogonek` anchors. The same anchors drive the `mark` and `mkmk` features, so any supported letter takes any of the 15 combining marks, and marks stack. `i` and `j` switch to dotless forms under a top mark. In Romanian and Moldovan text (`lang="ro"` or `lang="mo"`), Ş ş Ţ ţ display with a comma below.

## Sizes

Alawonn is hinted with ttfautohint for Windows. It reads well from 32 px up and holds together at 20 px. Below 20 px the gaps between pieces close up; use another face there.

## What it doesn't have

- Ligatures. The pieces are designed to sit next to each other without them.
- Other styles. Alawonn Regular is the only style, and the CSS uses it for every weight.
- Scripts other than Latin.
