"""Checks on the built fonts in dist/: tables, names, metrics and shaping."""

from __future__ import annotations

import io
import json
import sys
import unittest
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from charset import SUPPORTED, WINDOWS_1252  # noqa: E402
from versions import font_revision  # noqa: E402

TTF = ROOT / "dist/Alawonn-Regular.ttf"
WOFF2 = ROOT / "dist/Alawonn-Regular.woff2"
VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]


def shape(text: str, features: dict[str, bool] | None = None, language: str | None = None) -> list[tuple[str, int, int, int]]:
    face = hb.Face(TTF.read_bytes())
    font = hb.Font(face)
    buffer = hb.Buffer()
    buffer.add_str(text)
    buffer.guess_segment_properties()
    if language:
        buffer.language = language
    hb.shape(font, buffer, features or {})
    order = TTFont(TTF).getGlyphOrder()
    return [
        (order[info.codepoint], pos.x_advance, pos.x_offset, pos.y_offset)
        for info, pos in zip(buffer.glyph_infos, buffer.glyph_positions)
    ]


class FontTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.font = TTFont(TTF)
        cls.cmap = cls.font.getBestCmap()
        cls.glyphs = cls.font.getGlyphSet()

    def bounds(self, name: str) -> tuple[float, float, float, float]:
        pen = BoundsPen(self.glyphs)
        self.glyphs[name].draw(pen)
        assert pen.bounds is not None
        return pen.bounds

    def name(self, name_id: int) -> str:
        record = self.font["name"].getName(name_id, 3, 1, 0x409)
        assert record is not None, name_id
        return record.toUnicode()

    def test_character_map_matches_the_supported_list(self) -> None:
        self.assertEqual(sorted(self.cmap), sorted(ord(char) for char in SUPPORTED))

    def test_windows_1252_is_complete(self) -> None:
        self.assertEqual([c for c in WINDOWS_1252 if ord(c) not in self.cmap], [])

    def test_visible_characters_have_outlines(self) -> None:
        blank = {0x20, 0xA0, 0x2007, 0x2009, 0x202F}
        for code, name in self.cmap.items():
            if code in blank:
                continue
            self.assertIsNotNone(self.glyphs[name]._glyph if hasattr(self.glyphs[name], "_glyph") else True)
            pen = BoundsPen(self.glyphs)
            self.glyphs[name].draw(pen)
            self.assertIsNotNone(pen.bounds, f"U+{code:04X} {name} is empty")

    def test_spaces_are_empty_and_consistent(self) -> None:
        hmtx = self.font["hmtx"]
        self.assertEqual(hmtx[self.cmap[0x20]][0], hmtx[self.cmap[0xA0]][0])
        self.assertEqual(hmtx[self.cmap[0x2009]][0], hmtx[self.cmap[0x202F]][0])
        self.assertEqual(hmtx[self.cmap[0x2007]][0], hmtx["zero.tf"][0])
        for code in (0x20, 0xA0, 0x2007, 0x2009, 0x202F):
            pen = BoundsPen(self.glyphs)
            self.glyphs[self.cmap[code]].draw(pen)
            self.assertIsNone(pen.bounds)

    def test_notdef_is_first_and_visible(self) -> None:
        self.assertEqual(self.font.getGlyphOrder()[0], ".notdef")
        self.assertGreater(self.font["glyf"][".notdef"].numberOfContours, 0)

    def test_names(self) -> None:
        revision = font_revision(VERSION)
        self.assertEqual(self.name(1), "Alawonn")
        self.assertEqual(self.name(2), "Regular")
        self.assertEqual(self.name(3), f"{revision};ALWN;Alawonn-Regular")
        self.assertEqual(self.name(4), "Alawonn Regular")
        self.assertEqual(self.name(5), f"Version {revision}")
        self.assertEqual(self.name(6), "Alawonn-Regular")
        self.assertIn('Reserved Font Name "Alawonn"', self.name(0))
        self.assertIn("SIL Open Font License, Version 1.1", self.name(13))
        self.assertEqual(self.name(14), "https://openfontlicense.org")
        self.assertAlmostEqual(self.font["head"].fontRevision, float(revision), places=3)

    def test_os2_and_head(self) -> None:
        os2 = self.font["OS/2"]
        head = self.font["head"]
        self.assertEqual(head.unitsPerEm, 1000)
        self.assertEqual(os2.usWeightClass, 400)
        self.assertEqual(os2.usWidthClass, 5)
        self.assertEqual(os2.fsType, 0, "the font must be installable")
        self.assertEqual(os2.achVendID, "ALWN")
        self.assertEqual(os2.sxHeight, 700)
        self.assertEqual(os2.sCapHeight, 880)
        self.assertTrue(os2.fsSelection & (1 << 6), "REGULAR bit")
        self.assertTrue(os2.fsSelection & (1 << 7), "USE_TYPO_METRICS bit")
        self.assertTrue(head.flags & (1 << 3), "integer ppem for hinted fonts")
        self.assertEqual(head.created, head.modified)

    def test_vertical_metrics_agree_and_cover_every_glyph(self) -> None:
        os2 = self.font["OS/2"]
        hhea = self.font["hhea"]
        self.assertEqual((hhea.ascent, hhea.descent, hhea.lineGap), (os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap))
        head = self.font["head"]
        self.assertGreaterEqual(os2.usWinAscent, head.yMax)
        self.assertGreaterEqual(os2.usWinDescent, -head.yMin)
        self.assertGreater(os2.sTypoAscender, self.bounds(self.cmap[0xC0])[3])

    def test_hinting_tables(self) -> None:
        for table in ("fpgm", "prep", "cvt ", "gasp"):
            self.assertIn(table, self.font)
        self.assertEqual(self.font["gasp"].gaspRange, {0xFFFF: 0x000F})

    def test_layout_features(self) -> None:
        def features(table: str) -> set[str]:
            return {record.FeatureTag for record in self.font[table].table.FeatureList.FeatureRecord}

        self.assertLessEqual({"kern", "mark", "mkmk"}, features("GPOS"))
        self.assertLessEqual({"ccmp", "locl", "tnum", "pnum"}, features("GSUB"))
        self.assertIn("GDEF", self.font)

    def test_combining_marks_attach_above_and_below(self) -> None:
        # x has no precomposed accented forms, so HarfBuzz keeps the mark
        # separate and the mark feature positions it.
        base, mark = shape("x\u0301")
        self.assertEqual(mark[1], 0)
        self.assertGreater(self.bounds(mark[0])[1] + mark[3], self.bounds(base[0])[3])
        base, mark = shape("x\u0326")
        self.assertLess(self.bounds(mark[0])[3] + mark[3], 10)

    def test_stacked_marks_do_not_collide(self) -> None:
        glyphs = shape("x\u0308\u0301")
        lower = self.bounds(glyphs[1][0])[3] + glyphs[1][3]
        upper = self.bounds(glyphs[2][0])[1] + glyphs[2][3]
        self.assertGreater(upper, lower)

    def test_marks_stack_on_precomposed_letters(self) -> None:
        # HarfBuzz composes u + diaeresis into the precomposed glyph, so the
        # acute must attach to that glyph's propagated top anchor.
        glyphs = shape("u\u0308\u0301")
        self.assertEqual(len(glyphs), 2)
        base, mark = glyphs
        base_top = self.bounds(base[0])[3]
        self.assertGreater(self.bounds(mark[0])[1] + mark[3], base_top - 5)
        base_box = self.bounds(base[0])
        mark_box = self.bounds(mark[0])
        # A mark is drawn at the pen position after the base, plus its offset.
        mark_center = base[1] + mark[2] + (mark_box[0] + mark_box[2]) / 2
        self.assertLess(abs(mark_center - (base_box[0] + base_box[2]) / 2), 60)

    def test_decomposed_input_uses_precomposed_glyphs(self) -> None:
        self.assertEqual([g[0] for g in shape("e\u0301")], [self.cmap[0xE9]])
        self.assertEqual([g[0] for g in shape("A\u030a")], [self.cmap[0xC5]])

    def test_i_and_j_lose_their_dot_under_top_marks(self) -> None:
        self.assertEqual(shape("i\u030b")[0][0], self.cmap[0x131])
        self.assertEqual(shape("j\u0301")[0][0], self.cmap[0x237])

    def test_romanian_uses_comma_below(self) -> None:
        self.assertEqual(shape("\u015f", language="ro")[0][0], self.cmap[0x219])

    def test_tabular_figures(self) -> None:
        advances = {advance for _, advance, _, _ in shape("0123456789", {"tnum": True})}
        self.assertEqual(len(advances), 1)

    def test_kerning_is_applied(self) -> None:
        for pair in ("To", "Ta", "Fo", "ra"):
            kerned = sum(advance for _, advance, _, _ in shape(pair))
            plain = sum(advance for _, advance, _, _ in shape(pair, {"kern": False}))
            self.assertLess(kerned, plain, pair)

    def test_woff2_round_trip(self) -> None:
        woff2 = TTFont(WOFF2)
        self.assertEqual(woff2.flavor, "woff2")
        self.assertEqual(woff2.getBestCmap(), self.cmap)
        self.assertEqual(woff2.getGlyphOrder(), self.font.getGlyphOrder())
        decoded = io.BytesIO()
        woff2.flavor = None
        woff2.save(decoded)
        roundtrip = TTFont(decoded)
        for name in self.font.getGlyphOrder():
            original = self.font["glyf"][name]
            copy = roundtrip["glyf"][name]
            self.assertEqual(
                original.getCoordinates(self.font["glyf"])[0],
                copy.getCoordinates(roundtrip["glyf"])[0],
                name,
            )


if __name__ == "__main__":
    unittest.main()
