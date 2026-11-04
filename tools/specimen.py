"""Render SVG specimens from the compiled font.

    python tools/specimen.py

Text is shaped with HarfBuzz using dist/Alawonn-Regular.ttf, so the SVGs
show exactly what the font does: outlines, spacing, kerning and marks.
"""

from __future__ import annotations

import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.basePen import AbstractPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from charset import GROUPS  # noqa: E402

TTF = ROOT / "dist/Alawonn-Regular.ttf"
OUT = ROOT / "specimen"
GRAPHITE = "#25272A"
SILVER = "#A7AAAE"


class Shaper:
    def __init__(self, path: Path) -> None:
        data = path.read_bytes()
        self.font = TTFont(path)
        self.glyph_set = self.font.getGlyphSet()
        self.order = self.font.getGlyphOrder()
        self.hb_font = hb.Font(hb.Face(data))
        self.upem = self.font["head"].unitsPerEm

    def path(self, text: str, x: float = 0, y: float = 0, size: float | None = None) -> tuple[str, float]:
        """Return SVG path data for text with its baseline at y, and the advance."""
        pen = SVGPathPen(self.glyph_set, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
        advance = self.draw(pen, text, x, y, size)
        return pen.getCommands(), advance

    def bounds(self, text: str, size: float) -> tuple[float, float, float, float]:
        """Ink bounds of text in SVG coordinates (y down), baseline at 0."""
        pen = BoundsPen(self.glyph_set)
        self.draw(pen, text, 0, 0, size)
        assert pen.bounds is not None
        return pen.bounds

    def draw(self, pen: AbstractPen, text: str, x: float, y: float, size: float | None) -> float:
        scale = (size or self.upem) / self.upem
        buffer = hb.Buffer()
        buffer.add_str(text)
        buffer.guess_segment_properties()
        hb.shape(self.hb_font, buffer, {"kern": True, "liga": True, "mark": True, "mkmk": True})
        cursor = 0.0
        for info, pos in zip(buffer.glyph_infos, buffer.glyph_positions):
            name = self.order[info.codepoint]
            transform = (
                scale,
                0,
                0,
                -scale,
                x + (cursor + pos.x_offset) * scale,
                y - pos.y_offset * scale,
            )
            self.glyph_set[name].draw(TransformPen(pen, transform))
            cursor += pos.x_advance
        return cursor * scale


def svg(width: float, height: float, body: str, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {height:.0f}" '
        f'width="{width:.0f}" height="{height:.0f}" role="img" aria-label="{title}">\n'
        f"  <title>{title}</title>\n{body}</svg>\n"
    )


def render_wordmark(shaper: Shaper) -> list[Path]:
    size = 200
    pad = 24
    min_x, min_y, max_x, max_y = shaper.bounds("alawonn", size)
    data, _ = shaper.path("alawonn", x=pad - min_x, y=pad - min_y, size=size)
    width = max_x - min_x + pad * 2
    height = max_y - min_y + pad * 2
    outputs = []
    for name, color in (("wordmark.svg", GRAPHITE), ("wordmark-dark.svg", SILVER)):
        path = OUT / name
        path.write_text(svg(width, height, f'  <path fill="{color}" d="{data}"/>\n', "Alawonn"), encoding="utf-8")
        outputs.append(path)
    return outputs


def render_characters(shaper: Shaper) -> Path:
    cell = 72
    size = 44
    columns = 20
    rows: list[tuple[str, list[str]]] = []
    for group, chars in GROUPS.items():
        visible = [c for c in chars if not c.isspace() and c not in "\u2007\u2009\u202f\u00a0"]
        if group == "Combining marks":
            visible = ["\u25cc" + c for c in visible]
        for start in range(0, len(visible), columns):
            rows.append((group if start == 0 else "", visible[start : start + columns]))
    width = columns * cell + 32
    height = len(rows) * cell + 32
    body = []
    for row, (_, chars) in enumerate(rows):
        for column, text in enumerate(chars):
            _, advance = shaper.path(text, size=size)
            x = 16 + column * cell + (cell - advance) / 2
            y = 16 + row * cell + cell * 0.72
            data, _ = shaper.path(text, x=x, y=y, size=size)
            body.append(f'    <path d="{data}"/>\n')
    content = f'  <rect width="100%" height="100%" fill="#FFFFFF"/>\n  <g fill="{GRAPHITE}">\n' + "".join(body) + "  </g>\n"
    path = OUT / "characters.svg"
    path.write_text(svg(width, height, content, "Every character in Alawonn"), encoding="utf-8")
    return path


def render_character_data() -> Path:
    """Character list with Unicode names for the demo's character browser."""
    import json
    import unicodedata

    groups = []
    for group, chars in GROUPS.items():
        groups.append(
            {
                "name": group,
                "characters": [
                    {
                        "char": char,
                        "code": f"U+{ord(char):04X}",
                        "name": unicodedata.name(char, f"U+{ord(char):04X}").lower(),
                    }
                    for char in chars
                ],
            }
        )
    path = ROOT / "demo/src/characters.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(groups, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return path


def render_favicon(shaper: Shaper) -> Path:
    """Demo favicon: the lowercase a in silver on a black disc."""
    size = 64
    glyph_size = 50
    min_x, min_y, max_x, max_y = shaper.bounds("a", glyph_size)
    x = (size - (max_x - min_x)) / 2 - min_x
    y = (size - (max_y - min_y)) / 2 - min_y
    data, _ = shaper.path("a", x=x, y=y, size=glyph_size)
    body = f'  <circle cx="32" cy="32" r="32" fill="#000000"/>\n  <path fill="{SILVER}" d="{data}"/>\n'
    path = ROOT / "demo/public/favicon.svg"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(svg(size, size, body, "Alawonn"), encoding="utf-8")
    return path


def render() -> list[Path]:
    OUT.mkdir(exist_ok=True)
    shaper = Shaper(TTF)
    return [*render_wordmark(shaper), render_characters(shaper), render_character_data(), render_favicon(shaper)]


def main() -> None:
    for path in render():
        print(f"Rendered {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
