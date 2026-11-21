"""Rebuild the two registered panel references with Python and ImageMagick 7."""

import csv
import json
from pathlib import Path
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parent
LAYOUT = json.loads((ROOT / "layout.json").read_text(encoding="utf-8"))
LAMP_CELLS = (
    [(x, 0) for x in range(9)]
    + [(8, y) for y in range(1, 7)]
    + [(x, 6) for x in range(7, -1, -1)]
    + [(0, y) for y in range(5, 0, -1)]
)


def magick(*args, capture=False):
    return subprocess.run(
        ["magick", *map(str, args)], cwd=ROOT, check=True,
        capture_output=capture, text=True,
    ).stdout


def rectify(input_path, output_path, corners, size):
    width, height = size
    destination = [(0, 0), (width, 0), (width, height), (0, height)]
    transform = " ".join(
        f"{x},{y} {u},{v}" for (x, y), (u, v) in zip(corners, destination, strict=True)
    )
    magick(
        input_path, "-virtual-pixel", "edge", "-filter", "Mitchell",
        "-define", f"distort:viewport={width}x{height}+0+0",
        "-distort", "Perspective", transform, "+repage", output_path,
    )


def build_source(name, source):
    source_path = Path(source["file"])
    width, height = map(int, magick("identify", "-format", "%w %h", source_path, capture=True).split())
    if [width, height] != source["size"]:
        raise ValueError(f"{source_path} has different dimensions from layout.json")

    output = Path(name)
    for part in ("lamps", "keys", "key-symbols", "features"):
        (ROOT / output / part).mkdir(parents=True, exist_ok=True)
    zones = source["zones"]
    for zone, spec in zones.items():
        rectify(source_path, output / f"{zone}.png", spec["corners"], spec["size"])

    rows = []

    def add(part, item, label, input_path, bounds, size, row=None, column=None):
        x0, y0, x1, y1 = bounds
        if not (0 <= x0 < x1 <= size[0] and 0 <= y0 < y1 <= size[1]):
            raise ValueError(f"{name}/{item} is outside {input_path}: {bounds}")
        image_path = output / part / f"{item}.png"
        magick(input_path, "-crop", f"{x1-x0}x{y1-y0}+{x0}+{y0}", "+repage", image_path)
        item_id = item.split("-", 1)[0]
        rows.append({
            "source": name, "id": item_id, "part": part, "label": label,
            "row": row, "column": column, "image": image_path.as_posix(),
            "crop_from": input_path.as_posix(), "left": x0, "top": y0,
            "right": x1, "bottom": y1, "width": x1-x0, "height": y1-y0,
            "note": source["conditions"].get(item_id, ""),
        })

    board = output / "board.png"
    board_size = zones["board"]["size"]
    w, h = board_size[0] // 9, board_size[1] // 7
    for number, (symbol, (x, y)) in enumerate(zip(LAYOUT["lamps"], LAMP_CELLS, strict=True), 1):
        add("lamps", f"L{number:02d}-{symbol}", LAYOUT["labels"][symbol], board,
            (x*w, y*h, (x+1)*w, (y+1)*h), board_size, row=y+1, column=x+1)

    for part, zone in (("keys", "keytray"), ("key-symbols", "keyicons")):
        size = zones[zone]["size"]
        w_key = size[0] // 9
        spans = ([(n*w_key, (n+1)*w_key) for n in range(9)]
                 if part == "keys" else source["key_icon_spans"])
        for number, (symbol, (x0, x1)) in enumerate(zip(LAYOUT["keys"], spans, strict=True), 1):
            add(part, f"K{number:02d}-{symbol}", LAYOUT["labels"][symbol],
                output / f"{zone}.png", (x0, 0, x1, size[1]), size, column=number)

    for item, label in LAYOUT["features"].items():
        if item == "F03-centre":
            add("features", item, label, board, (w, h, 8*w, 6*h), board_size)
        else:
            add("features", item, label, source_path, source["features"][item], source["size"])
    return rows


def make_sheet(rows, part, name, columns):
    views = {(row["source"], row["id"]): row for row in rows if row["part"] == part}
    ids = sorted(item for source, item in views if source == "photo")
    with tempfile.TemporaryDirectory() as temp:
        cards = []
        for item in ids:
            panels = []
            for source in ("photo", "ruten"):
                crop = views[source, item]["image"]
                panels.extend(["(", crop, "-filter", "point", "-resize", "66x64", "-gravity", "center", "-extent", "72x70", ")"])
            out = Path(temp) / f"{item}.png"
            magick("-background", "#f3efe6", "-fill", "#202927", "-font", "Arial", "-pointsize", "13",
                   "(", "-size", "144x20", "-gravity", "center", f"label:{item}", ")",
                   "(", *panels, "+append", ")", "-append", "+set", "label", out)
            cards.append(out)
        magick("montage", *cards, "-tile", f"{columns}x", "-geometry", "+5+5",
               "-background", "#e0ddd5", name)


def main():
    rows = [row for name, source in LAYOUT["sources"].items() for row in build_source(name, source)]
    with (ROOT / "index.csv").open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    make_sheet(rows, "lamps", "compare-lamps.png", 7)
    make_sheet(rows, "key-symbols", "compare-key-symbols.png", 5)
    make_sheet(rows, "keys", "compare-keys.png", 5)


if __name__ == "__main__":
    main()
