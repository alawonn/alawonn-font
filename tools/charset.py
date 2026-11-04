"""The characters Alawonn supports.

This list is the contract for the font, the tests, the demo's character
grid and the README coverage section. Add a character here first, then
draw it in the UFO.
"""

from __future__ import annotations


def _span(first: int, last: int) -> list[str]:
    return [chr(code) for code in range(first, last + 1)]


# Every printable ASCII character, including space.
BASIC_LATIN = _span(0x20, 0x7E)

# Latin-1 Supplement. U+00AD (soft hyphen) is left out on purpose: browsers
# and word processors handle it without a glyph.
LATIN_1 = [char for char in _span(0xA0, 0xFF) if char != "\u00ad"]

# Latin Extended-A, complete.
LATIN_EXTENDED_A = _span(0x100, 0x17F)

# Romanian comma-below letters and the dotless j.
LATIN_EXTRA = ["\u0218", "\u0219", "\u021a", "\u021b", "\u0237"]

# Spacing accents (modifier letters).
MODIFIERS = ["\u02c6", "\u02c7", "\u02c9", "\u02d8", "\u02d9", "\u02da", "\u02db", "\u02dc", "\u02dd"]

# Combining marks. They attach to any supported letter through the
# OpenType mark and mkmk features.
COMBINING = [
    "\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0306", "\u0307", "\u0308",
    "\u030a", "\u030b", "\u030c", "\u0312", "\u0326", "\u0327", "\u0328",
]

# Spaces, dashes, quotes and other punctuation used in typeset text.
PUNCTUATION = [
    "\u2007", "\u2009", "\u202f",  # figure space, thin space, narrow no-break space
    "\u2010", "\u2011", "\u2012", "\u2013", "\u2014",  # hyphen, no-break hyphen, figure dash, en dash, em dash
    "\u2018", "\u2019", "\u201a", "\u201c", "\u201d", "\u201e",  # quotes
    "\u2020", "\u2021", "\u2022", "\u2026", "\u2030",  # daggers, bullet, ellipsis, per mille
    "\u2039", "\u203a", "\u2044",  # single guillemets, fraction slash
    "\u2122",  # trade mark
    "\u25cc",  # dotted circle, used to show combining marks on their own
]

# Currency and math signs beyond Latin-1.
SYMBOLS = ["\u0192", "\u20ac", "\u2212", "\u2248", "\u2260", "\u2264", "\u2265"]

GROUPS: dict[str, list[str]] = {
    "Basic Latin": BASIC_LATIN,
    "Latin-1 Supplement": LATIN_1,
    "Latin Extended-A": LATIN_EXTENDED_A,
    "Latin extras": LATIN_EXTRA,
    "Spacing accents": MODIFIERS,
    "Combining marks": COMBINING,
    "Punctuation": PUNCTUATION,
    "Symbols": SYMBOLS,
}

SUPPORTED: list[str] = list(dict.fromkeys(char for group in GROUPS.values() for char in group))

# Windows-1252 code page, minus the soft hyphen. Used by the tests.
WINDOWS_1252 = [
    char
    for char in bytes(range(0x20, 0x100)).decode("cp1252", errors="ignore")
    if char not in ("\u00ad", "\x7f")
]


if __name__ == "__main__":
    import json
    import sys

    json.dump(
        {name: [f"U+{ord(char):04X}" for char in chars] for name, chars in GROUPS.items()},
        sys.stdout,
        indent=2,
    )
    print()
    print(f"{len(SUPPORTED)} characters", file=sys.stderr)
