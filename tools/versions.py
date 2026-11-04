"""One version for everything.

The npm version X.Y.Z maps to the OpenType revision X.YYZ written with three
decimals: 1.0.0 -> 1.000, 1.0.1 -> 1.001, 1.2.0 -> 1.020. Minor stays below
100 and patch below 10.

    python tools/versions.py          # print every version field
    python tools/versions.py --check  # exit 1 if any field disagrees
"""

from __future__ import annotations

import json
import plistlib
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEMVER = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")


def font_revision(version: str) -> str:
    match = SEMVER.match(version)
    if not match:
        raise ValueError(f"{version!r} is not a plain X.Y.Z version")
    major, minor, patch = (int(part) for part in match.groups())
    if minor > 99 or patch > 9:
        raise ValueError(f"{version!r} can't be written as an OpenType revision")
    return f"{major}.{minor * 10 + patch:03d}"


def fields() -> dict[str, str]:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    pyproject = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    fontinfo = plistlib.loads((ROOT / "sources/Alawonn-Regular.ufo/fontinfo.plist").read_bytes())
    css = (ROOT / "css/alawonn.css").read_text(encoding="utf-8")
    fontlog = (ROOT / "FONTLOG.md").read_text(encoding="utf-8")
    css_match = re.search(r"alawonn-font (\S+)", css)
    log_match = re.search(r"^## (\d+\.\d+\.\d+)", fontlog, re.MULTILINE)
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    pinned = sorted(set(re.findall(r"alawonn-font@(\d+\.\d+\.\d+)", readme)))
    return {
        "package.json": package["version"],
        "pyproject.toml": pyproject["project"]["version"],
        "fontinfo revision": f"{fontinfo['versionMajor']}.{fontinfo['versionMinor']:03d}",
        "fontinfo name ID 5": fontinfo["openTypeNameVersion"],
        "fontinfo name ID 3": fontinfo["openTypeNameUniqueID"],
        "css/alawonn.css": css_match.group(1) if css_match else "missing",
        "FONTLOG.md": log_match.group(1) if log_match else "missing",
        "README CDN links": ",".join(pinned) or "missing",
    }


def problems() -> list[str]:
    found = fields()
    version = found["package.json"]
    revision = font_revision(version)
    expected = {
        "package.json": version,
        "pyproject.toml": version,
        "fontinfo revision": revision,
        "fontinfo name ID 5": f"Version {revision}",
        "fontinfo name ID 3": f"{revision};ALWN;Alawonn-Regular",
        "css/alawonn.css": version,
        "FONTLOG.md": version,
        "README CDN links": version,
    }
    return [
        f"{name}: found {found[name]!r}, expected {value!r}"
        for name, value in expected.items()
        if found[name] != value
    ]


def main() -> int:
    if "--check" in sys.argv:
        issues = problems()
        for issue in issues:
            print(issue, file=sys.stderr)
        return 1 if issues else 0
    for name, value in fields().items():
        print(f"{name}: {value}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
