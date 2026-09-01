"""Composite tree candidates and render side-by-side with Kenney samples."""
from PIL import Image
from pathlib import Path

T = 18
OUT = Path("_tile_debug")
OUT.mkdir(exist_ok=True)


def render_recipe(tiles, sheet, w, h, scale=8):
    cols = 20 if sheet == "base" else 16
    im = Image.open(f"src/client/sprites/{sheet}.png" if sheet == "farm" else "src/client/sprites/tilemap.png").convert("RGBA")
    out = Image.new("RGBA", (w * T * scale, h * T * scale), (0, 0, 0, 0))
    for p in tiles:
        tile = p["tile"]
        tx = (tile % cols) * T
        ty = (tile // cols) * T
        t = im.crop((tx, ty, tx + T, ty + T)).resize((T * scale, T * scale), Image.NEAREST)
        out.paste(t, (p["x"] * T * scale, (h - 1 - p["y"]) * T * scale), t)
    return out


def trunk_col(x, segments, layer=0):
    return [{"x": x, "y": i, "tile": t, "layer": layer} for i, t in enumerate(segments)]


def birch_grid(col0, row0, w, h, x0, y0, layer=1):
    grid = [
        [13, 14, 15],
        [29, 30, 31],
        [45, 46, 47],
    ]
    return [
        {"x": x0 + c, "y": y0 + r, "tile": grid[row0 + r][col0 + c], "layer": layer}
        for r in range(h)
        for c in range(w)
    ]


# Birch: proper canopy grid + 109/110 trunk
birch_small = [
    *trunk_col(1, [109, 110]),
    *birch_grid(1, 1, 2, 2, 0, 2),
]
birch_big = [
    *trunk_col(1, [109, 110, 110]),
    *birch_grid(0, 1, 3, 2, 0, 3),
]
birch_tall = [
    *trunk_col(1, [109, 110, 110, 110]),
    *birch_grid(1, 0, 2, 3, 0, 4),
]

# Green from TMX example-a
green = [
    *trunk_col(1, [109, 89, 89]),
    {"x": 0, "y": 3, "tile": 96, "layer": 1},
    {"x": 1, "y": 3, "tile": 97, "layer": 1},
    {"x": 2, "y": 3, "tile": 98, "layer": 1},
    *[{"x": c, "y": 4 + r, "tile": t, "layer": 1} for r, row in enumerate([[57, 58, 59], [17, 18, 19]]) for c, t in enumerate(row)],
]
green_big = [
    *[{"x": 3, "y": i, "tile": t} for i, t in enumerate([109, 89, 89])],
    {"x": 2, "y": 3, "tile": 96, "layer": 1},
    {"x": 3, "y": 3, "tile": 97, "layer": 1},
    {"x": 4, "y": 3, "tile": 98, "layer": 1},
    {"x": 0, "y": 4, "tile": 57, "layer": 1},
    {"x": 1, "y": 4, "tile": 58, "layer": 1},
    {"x": 2, "y": 4, "tile": 59, "layer": 1},
    {"x": 4, "y": 4, "tile": 57, "layer": 1},
    {"x": 5, "y": 4, "tile": 58, "layer": 1},
    {"x": 6, "y": 4, "tile": 59, "layer": 1},
    {"x": 0, "y": 5, "tile": 17, "layer": 1},
    {"x": 1, "y": 5, "tile": 18, "layer": 1},
    {"x": 2, "y": 5, "tile": 19, "layer": 1},
    {"x": 4, "y": 5, "tile": 37, "layer": 1},
    {"x": 5, "y": 5, "tile": 38, "layer": 1},
    {"x": 6, "y": 5, "tile": 39, "layer": 1},
    {"x": 4, "y": 6, "tile": 17, "layer": 1},
    {"x": 5, "y": 6, "tile": 18, "layer": 1},
    {"x": 6, "y": 6, "tile": 19, "layer": 1},
]

configs = {
    "birch_small": (birch_small, "farm", 2, 4),
    "birch_big": (birch_big, "farm", 3, 5),
    "birch_tall": (birch_tall, "farm", 2, 6),
    "green": (green, "base", 3, 6),
    "green_big": (green_big, "base", 7, 7),
}

for name, (tiles, sheet, w, h) in configs.items():
    render_recipe(tiles, sheet, w, h).save(OUT / f"candidate_{name}.png")

# Side-by-side with samples
sample_farm = Image.open("art/pixel-platformer-farm-expansion/Sample.png").convert("RGBA")
sample_base = Image.open("art/pixel-platformer/SampleA.png").convert("RGBA")

# crop a birch from farm sample (left tree area ~ x=30-120, y=80-280)
crop_birch = sample_farm.crop((40, 60, 200, 340)).resize((320, 560), Image.NEAREST)
crop_green = sample_base.crop((340, 40, 520, 320)).resize((360, 560), Image.NEAREST)

birch_cmp = Image.new("RGBA", (700, 560), (40, 40, 40, 255))
birch_cmp.paste(crop_birch, (0, 0))
birch_cmp.paste(render_recipe(birch_big, "farm", 3, 5, 10), (380, 80))
birch_cmp.save(OUT / "compare_birch.png")

green_cmp = Image.new("RGBA", (700, 560), (40, 40, 40, 255))
green_cmp.paste(crop_green, (0, 0))
green_cmp.paste(render_recipe(green_big, "base", 7, 7, 10), (380, 40))
green_cmp.save(OUT / "compare_green.png")

print("done")
