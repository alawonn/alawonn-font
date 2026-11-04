"""Release checks for Alawonn.

    python tools/check.py

1. Every version field agrees (tools/versions.py).
2. Two builds in a row produce identical bytes, and they match dist/.
3. OpenType Sanitizer accepts the TTF and the WOFF2.
4. fontTools can decompile and recompile every table.
5. FontBakery's universal profile has no FAIL or FATAL, and only the
   warnings listed in ALLOWED_WARNINGS.
6. The npm package ships exactly the expected files, and every export
   and CSS url() points at a file in the package.

Exit status is 0 only when every check passes.
"""

from __future__ import annotations

import hashlib
import io
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import versions  # noqa: E402

DIST = ROOT / "dist"
FONTS = [DIST / "Alawonn-Regular.ttf", DIST / "Alawonn-Regular.woff2"]

# Each allowed warning names the check and the reason it's intentional.
ALLOWED_WARNINGS = {
    "contour_count": (
        "Alawonn draws many letters from separate sculpted pieces with open "
        "gaps between them, so contour counts differ from typical fonts."
    ),
}

PACKAGE_FILES = {
    "FONTLOG.md",
    "OFL.txt",
    "README.md",
    "TRADEMARKS.md",
    "css/alawonn.css",
    "dist/Alawonn-Regular.ttf",
    "dist/Alawonn-Regular.woff2",
    "dist/SHA256SUMS",
    "package.json",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def step(title: str) -> None:
    print(f"\n== {title}", flush=True)


def check_versions() -> list[str]:
    step("Versions")
    issues = versions.problems()
    if not issues:
        print(f"All fields at {versions.fields()['package.json']}")
    return issues


def check_determinism() -> list[str]:
    step("Deterministic build")
    committed = {path.name: sha256(path) for path in FONTS}
    builds = []
    for _ in range(2):
        subprocess.run([sys.executable, str(ROOT / "tools/build.py")], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
        builds.append({path.name: sha256(path) for path in FONTS})
    issues = []
    if builds[0] != builds[1]:
        issues.append("two builds in a row produced different bytes")
    if builds[1] != committed:
        issues.append("dist/ was out of date; it has been rebuilt, commit the result")
    for name, digest in builds[1].items():
        print(f"{digest}  {name}")
    return issues


def check_sanitizer() -> list[str]:
    step("OpenType Sanitizer")
    import ots

    issues = []
    with tempfile.TemporaryDirectory() as tmp:
        for path in FONTS:
            result = ots.sanitize(str(path), str(Path(tmp, path.name)), capture_output=True)
            if result.returncode != 0:
                issues.append(f"OTS rejected {path.name}: {result.stderr.decode().strip()}")
            else:
                print(f"OTS accepted {path.name}")
    return issues


def check_round_trip() -> list[str]:
    step("fontTools round trip")
    from fontTools.ttLib import TTFont

    issues = []
    for path in FONTS:
        font = TTFont(path)
        for tag in font.keys():
            if tag == "GlyphOrder":
                continue
            font[tag].compile(font) if hasattr(font[tag], "compile") else None
        buffer = io.BytesIO()
        font.save(buffer)
        reloaded = TTFont(io.BytesIO(buffer.getvalue()))
        if reloaded.getBestCmap() != font.getBestCmap():
            issues.append(f"{path.name}: cmap changed after a round trip")
        xml = io.StringIO()
        reloaded.saveXML(xml, tables=["name", "OS/2", "head", "hhea", "post", "GPOS", "GSUB"])
        print(f"{path.name}: {len(font.getGlyphOrder())} glyphs, {len(font.getBestCmap())} characters")
    return issues


def check_fontbakery() -> list[str]:
    step("FontBakery universal profile")
    with tempfile.TemporaryDirectory() as tmp:
        report = Path(tmp, "report.json")
        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontbakery",
                "check-universal",
                "--skip-network",
                "--config",
                str(ROOT / "fontbakery.yaml"),
                "--json",
                str(report),
                "--loglevel",
                "WARN",
                str(DIST / "Alawonn-Regular.ttf"),
            ],
            cwd=ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        data = json.loads(report.read_text(encoding="utf-8"))
    counts: dict[str, int] = {}
    issues = []
    for section in data["sections"]:
        for check in section["checks"]:
            result = check["result"]
            counts[result] = counts.get(result, 0) + 1
            # key looks like ["<Section: ...>", "<FontBakeryCheck:contour_count>", ...]
            check_id = re.sub(r"^<FontBakeryCheck:(.*)>$", r"\1", check["key"][1])
            if result in ("FAIL", "FATAL", "ERROR"):
                issues.append(f"FontBakery {result}: {check_id}")
            elif result == "WARN" and check_id not in ALLOWED_WARNINGS:
                issues.append(f"FontBakery WARN not on the allow list: {check_id}")
            elif result == "WARN":
                print(f"WARN {check_id} (allowed: {ALLOWED_WARNINGS[check_id]})")
    print(", ".join(f"{name} {count}" for name, count in sorted(counts.items())))
    return issues


def check_package() -> list[str]:
    step("npm package")
    issues = []
    npm = shutil.which("npm")
    if npm is None:
        return ["npm is not installed"]
    result = subprocess.run([npm, "pack", "--dry-run", "--json"], cwd=ROOT, capture_output=True, text=True, check=True)
    files = {entry["path"] for entry in json.loads(result.stdout)[0]["files"]}
    if files != PACKAGE_FILES:
        issues.append(f"package files differ: extra {sorted(files - PACKAGE_FILES)}, missing {sorted(PACKAGE_FILES - files)}")
    else:
        print(f"{len(files)} files: {', '.join(sorted(files))}")
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    for key, target in package["exports"].items():
        if "*" in target:
            continue
        if target.lstrip("./") not in files:
            issues.append(f"export {key} points at {target}, which isn't packaged")
    css = (ROOT / "css/alawonn.css").read_text(encoding="utf-8")
    for url in re.findall(r'url\("([^"]+)"\)', css):
        resolved = (ROOT / "css" / url).resolve().relative_to(ROOT).as_posix()
        if resolved not in files:
            issues.append(f"css url {url} resolves to {resolved}, which isn't packaged")
    checksums = (DIST / "SHA256SUMS").read_text(encoding="utf-8")
    for path in FONTS:
        if f"{sha256(path)}  {path.name}" not in checksums:
            issues.append(f"SHA256SUMS doesn't match {path.name}")
    return issues


def main() -> int:
    issues: list[str] = []
    for check in (check_versions, check_determinism, check_sanitizer, check_round_trip, check_fontbakery, check_package):
        issues += check()
    print()
    if issues:
        print("Release checks failed:", file=sys.stderr)
        for issue in issues:
            print(f"  - {issue}", file=sys.stderr)
        return 1
    print("Release checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
