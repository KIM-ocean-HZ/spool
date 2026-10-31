#!/usr/bin/env python3
"""Re-export cumulative native layers from this candidate's frozen .icon.

The adopted final PNG is deliberately kept byte-for-byte. Intermediate native
exports are ColorSync-converted from Display P3 to sRGB, never merely re-tagged.
"""
import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

source = Path(__file__).resolve().parent
stages = source / "stages"
manifest = json.loads((source / "manifest.json").read_text())
final = stages / "05-final.png"
assert hashlib.sha256(final.read_bytes()).hexdigest() == manifest["adopted_artwork_sha256"]
native = source / "Spool.icon"
document = json.loads((native / "icon.json").read_text())
ictool = Path("/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool")
assert ictool.exists(), "Install Xcode with Icon Composer before rebuilding native stages"

flange = {"01-glass-flange.svg"}
winding = flange | {"04-winding.svg", "07-filament-satin.svg"}
axle = winding | {"05-axle-body.svg", "05-axle-highlights.svg"}
shadows = axle | {"02-thread-shadows.svg"}
definitions = [
    ("00-tile", set()),
    ("01-flange", flange),
    ("02-winding", winding),
    ("03-axle", axle),
    ("03b-shadows", shadows),
    ("04-thread", shadows | {"03-thread.svg"}),
]
with tempfile.TemporaryDirectory(prefix="spool-motion-native-") as temporary:
    temporary = Path(temporary)
    for name, allowed in definitions:
        bundle = temporary / f"{name}.icon"
        shutil.copytree(native, bundle)
        filtered = copy.deepcopy(document)
        filtered["groups"] = []
        for group in document["groups"]:
            retained = [layer for layer in group["layers"] if layer["image-name"] in allowed]
            if retained:
                new_group = copy.deepcopy(group)
                new_group["layers"] = retained
                filtered["groups"].append(new_group)
        (bundle / "icon.json").write_text(json.dumps(filtered, indent=2) + "\n")
        p3 = temporary / f"{name}-p3.png"
        subprocess.run([str(ictool), str(bundle), "--export-image", "--output-file", str(p3),
                        "--platform", "macOS", "--rendition", "Default", "--width", "1024",
                        "--height", "1024", "--scale", "1", "--design-generation", "27"], check=True)
        subprocess.run(["sips", "--matchTo", "/System/Library/ColorSync/Profiles/sRGB Profile.icc",
                        str(p3), "--out", str(stages / f"{name}.png")], check=True)
        print(f"Prepared {name}")

