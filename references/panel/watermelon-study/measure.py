"""Measure the red cut faces at native resolution. Requires ImageMagick 7."""

import json
from math import atan2, degrees, hypot, sqrt
from pathlib import Path
from statistics import mean
from subprocess import check_output


HERE = Path(__file__).resolve().parent
SOURCES = {
    "L10": ("ruten/lamps/L10-watermelon.png", (2, 10, 46, 41)),
    "K02": ("ruten/key-symbols/K02-watermelon.png", (4, 4, 42, 29)),
}


def pixels(path):
    width, height = map(int, check_output(
        ["magick", "identify", "-format", "%w %h", path], text=True,
    ).split())
    rgb = check_output(["magick", path, "-alpha", "off", "-colorspace", "sRGB", "-depth", "8", "rgb:-"])
    return width, height, list(zip(rgb[::3], rgb[1::3], rgb[2::3], strict=True))


def ellipse(points):
    cx = mean(x for x, _ in points)
    cy = mean(y for _, y in points)
    xx = mean((x-cx)**2 for x, _ in points)
    yy = mean((y-cy)**2 for _, y in points)
    xy = mean((x-cx)*(y-cy) for x, y in points)
    spread = hypot((yy-xx)/2, xy)
    trace = (xx+yy)/2
    return {
        "cx": cx, "cy": cy,
        # A uniformly filled ellipse has covariance eigenvalues r² / 4.
        "width": 4*sqrt(trace-spread), "height": 4*sqrt(trace+spread),
        "tilt_from_vertical_deg": degrees(atan2(2*xy, yy-xx))/2,
        "mask_pixels": len(points),
    }


def ink_extent(rgb, width, roi):
    x0, y0, x1, y1 = roi
    points = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            red, green, blue = rgb[y*width+x]
            rind = green-red > 12 and blue-red > 10 and max(red, green, blue) < 135
            flesh = red-green > 25 and red-blue > 10 and red > 45
            if rind or flesh:
                points.append((x, y))
    # A robust envelope of colored ink, excluding isolated dark JPEG pixels.
    xs, ys = (sorted(axis) for axis in zip(*points, strict=True))
    trim = len(points) // 100
    return [xs[trim], ys[trim], xs[-1-trim]+1, ys[-1-trim]+1]


def measure(relative, roi):
    width, height, rgb = pixels(HERE.parent / relative)
    cuts = []
    for threshold in (20, 25, 30, 35):
        # Only segment dark red flesh. Pale rims, green rind and glare are excluded.
        sides = [[], []]
        for i, (red, green, blue) in enumerate(rgb):
            if red-green > threshold and red-blue > 10 and red > 45:
                x, y = i % width + 0.5, i // width + 0.5
                sides[int(x >= width * 0.62)].append((x, y))
        left, right = map(ellipse, sides)
        cuts.append({
            "red_minus_green_threshold": threshold, "faces": [left, right],
            "pitch_px": right["cx"]-left["cx"],
            "vertical_offset_px": right["cy"]-left["cy"],
        })
    return {
        "source": relative, "size_px": [width, height],
        "ink_extent_roi": roi, "ink_extent_px": ink_extent(rgb, width, roi),
        "fit": cuts[1], "sensitivity": cuts,
    }


def main():
    evidence = {name: measure(*source_spec) for name, source_spec in SOURCES.items()}
    primary = evidence["L10"]["fit"]
    # Approximate proportional constraints only. The drawing uses its own smooth
    # outline, surface colors and symmetric stripe curves.
    evidence["design"] = {
        "basis": "Use L10 as the primary scale; compare K02 independently.",
        "view_box": [96, 80], "scale_from_primary": 2,
        "pitch": round(primary["pitch_px"] * 2),
        "red_face_width": round(mean(face["width"] for face in primary["faces"]) * 2, 1),
        "red_face_height": round(mean(face["height"] for face in primary["faces"]) * 2, 1),
        "vertical_offset": 0, "shared_tilt_deg": 0,
        "stripe_constraint": "Two upper rind curves and their reflections about y=40. Highlights are separate.",
    }
    (HERE / "measurements.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence["design"], indent=2))


if __name__ == "__main__":
    main()
