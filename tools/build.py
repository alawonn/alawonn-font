"""Build Alawonn from the UFO source.

    python tools/build.py

Writes dist/Alawonn-Regular.ttf, dist/Alawonn-Regular.woff2 and
dist/SHA256SUMS, then renders the specimen SVGs. The output is
byte-identical on every run with the pinned toolchain in requirements.txt.
"""

from __future__ import annotations

import hashlib
import io
import sys
from pathlib import Path

import ttfautohint
import ufo2ft
import ufoLib2
from fontTools.designspaceLib import DesignSpaceDocument
from fontTools.ttLib import TTFont, newTable

ROOT = Path(__file__).resolve().parents[1]
DESIGNSPACE = ROOT / "sources/Alawonn.designspace"
DIST = ROOT / "dist"
TTF = DIST / "Alawonn-Regular.ttf"
WOFF2 = DIST / "Alawonn-Regular.woff2"
CHECKSUMS = DIST / "SHA256SUMS"


def load_source() -> ufoLib2.Font:
    document = DesignSpaceDocument.fromfile(DESIGNSPACE)
    default = document.findDefault()
    if default is None:
        raise SystemExit("The designspace has no default source")
    return ufoLib2.Font.open(Path(DESIGNSPACE.parent, default.filename))


def compile_ttf(ufo: ufoLib2.Font) -> TTFont:
    return ufo2ft.compileTTF(
        ufo,
        removeOverlaps=True,
        overlapsBackend="pathops",
        useProductionNames=False,
        reverseDirection=True,
    )


def fix_timestamps(font: TTFont) -> None:
    # ufo2ft stamps head.modified with the current time. Use the source's
    # creation date for both fields so rebuilds are byte-identical.
    head = font["head"]
    head.modified = head.created


def autohint(font: TTFont) -> TTFont:
    raw = io.BytesIO()
    font.save(raw, reorderTables=True)
    hinted = ttfautohint.ttfautohint(
        in_buffer=raw.getvalue(),
        hinting_range_min=8,
        hinting_range_max=72,
        hinting_limit=200,
        default_script="latn",
        fallback_script="latn",
        increase_x_height=14,
        no_info=True,
    )
    result = TTFont(io.BytesIO(hinted), recalcTimestamp=False)
    gasp = newTable("gasp")
    gasp.version = 1
    # Grid-fit and smooth at every size: the outlines are hinted, and
    # ClearType symmetric smoothing keeps curves even.
    gasp.gaspRange = {0xFFFF: 0x000F}
    result["gasp"] = gasp
    # Hinted fonts must round ppem to integers (head.flags bit 3).
    result["head"].flags |= 1 << 3
    fix_timestamps(result)
    return result


def save(font: TTFont, path: Path, flavor: str | None = None) -> None:
    font.flavor = flavor
    buffer = io.BytesIO()
    font.save(buffer, reorderTables=True)
    path.write_bytes(buffer.getvalue())


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build() -> None:
    DIST.mkdir(exist_ok=True)
    ufo = load_source()
    font = compile_ttf(ufo)
    fix_timestamps(font)
    font = autohint(font)
    save(font, TTF)

    webfont = TTFont(TTF, recalcTimestamp=False)
    save(webfont, WOFF2, flavor="woff2")

    CHECKSUMS.write_text(
        "".join(f"{sha256(path)}  {path.name}\n" for path in (TTF, WOFF2)),
        encoding="utf-8",
    )


def main() -> None:
    build()
    sys.path.insert(0, str(ROOT / "tools"))
    import specimen

    specimen.render()
    for path in (TTF, WOFF2):
        print(f"Built {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
