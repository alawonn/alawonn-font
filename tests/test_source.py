"""Checks on the UFO source: structure, outlines, anchors, kerning and coverage."""

from __future__ import annotations

import json
import sys
import unicodedata
import unittest
from pathlib import Path

import ufoLib2
from fontTools.designspaceLib import DesignSpaceDocument

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from charset import SUPPORTED  # noqa: E402
from versions import font_revision  # noqa: E402

DESIGNSPACE = ROOT / "sources/Alawonn.designspace"


def signed_area(points: list[tuple[float, float]]) -> float:
    return sum(
        x0 * y1 - x1 * y0
        for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1])
    ) / 2


class SourceTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        document = DesignSpaceDocument.fromfile(DESIGNSPACE)
        default = document.findDefault()
        assert default is not None
        cls.ufo = ufoLib2.Font.open(DESIGNSPACE.parent / default.filename)

    def test_designspace_has_one_default_source(self) -> None:
        document = DesignSpaceDocument.fromfile(DESIGNSPACE)
        self.assertEqual(len(document.sources), 1)
        self.assertIsNotNone(document.findDefault())

    def test_every_supported_character_is_mapped_once(self) -> None:
        mapped: dict[int, str] = {}
        for glyph in self.ufo:
            for code in glyph.unicodes:
                self.assertNotIn(code, mapped, f"U+{code:04X} is mapped twice")
                mapped[code] = glyph.name
        self.assertEqual(sorted(mapped), sorted(ord(char) for char in SUPPORTED))

    def test_contours_are_closed_and_clean(self) -> None:
        for glyph in self.ufo:
            for contour in glyph.contours:
                types = [point.type for point in contour.points]
                self.assertNotIn("move", types, f"{glyph.name} has an open contour")
                on_curve = [p for p in contour.points if p.type is not None]
                self.assertGreaterEqual(len(on_curve), 2, glyph.name)
                coords = [(p.x, p.y) for p in contour.points]
                for index, point in enumerate(coords):
                    self.assertNotEqual(
                        point,
                        coords[index - 1],
                        f"{glyph.name} has a duplicate point at {point}",
                    )
                for point in contour.points:
                    self.assertIsInstance(point.x, int, glyph.name)
                    self.assertIsInstance(point.y, int, glyph.name)

    def test_outer_contours_run_counterclockwise(self) -> None:
        # UFO uses PostScript direction: filled areas counterclockwise.
        for glyph in self.ufo:
            if not glyph.contours:
                continue
            total = sum(
                signed_area([(p.x, p.y) for p in contour.points if p.type is not None])
                for contour in glyph.contours
            )
            self.assertGreater(total, 0, f"{glyph.name} is wound the wrong way")

    def test_components_are_plain_offsets_to_existing_glyphs(self) -> None:
        for glyph in self.ufo:
            for component in glyph.components:
                self.assertIn(component.baseGlyph, self.ufo, glyph.name)
                xx, xy, yx, yy, _, _ = component.transformation
                self.assertEqual((xx, xy, yx, yy), (1, 0, 0, 1), f"{glyph.name} scales a component")

    def test_letters_have_mark_anchors(self) -> None:
        for glyph in self.ufo:
            if not glyph.unicodes or glyph.components:
                continue
            char = chr(glyph.unicodes[0])
            if unicodedata.category(char) not in ("Lu", "Ll") or char in "\u00aa\u00ba":
                continue
            names = {anchor.name for anchor in glyph.anchors}
            self.assertLessEqual({"top", "bottom"}, names, glyph.name)

    def test_combining_marks_have_attachment_anchors(self) -> None:
        for glyph in self.ufo:
            if not glyph.unicodes or unicodedata.category(chr(glyph.unicodes[0])) != "Mn":
                continue
            names = {anchor.name for anchor in glyph.anchors}
            self.assertTrue(names & {"_top", "_bottom", "_ogonek"}, glyph.name)
            self.assertEqual(glyph.width, 0, f"{glyph.name} must have zero advance")

    def test_kerning_uses_existing_glyphs_and_groups(self) -> None:
        groups = self.ufo.groups
        for name, members in groups.items():
            self.assertTrue(name.startswith(("public.kern1.", "public.kern2.")), name)
            for member in members:
                self.assertIn(member, self.ufo, name)
        for (left, right), value in self.ufo.kerning.items():
            for side in (left, right):
                self.assertTrue(side in groups or side in self.ufo, side)
            self.assertLessEqual(abs(value), 250, (left, right))

    def test_version_matches_package(self) -> None:
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        info = self.ufo.info
        self.assertEqual(f"{info.versionMajor}.{info.versionMinor:03d}", font_revision(package["version"]))
        self.assertEqual(info.openTypeNameVersion, f"Version {font_revision(package['version'])}")
        self.assertEqual(
            info.openTypeNameUniqueID,
            f"{font_revision(package['version'])};ALWN;Alawonn-Regular",
        )


if __name__ == "__main__":
    unittest.main()
