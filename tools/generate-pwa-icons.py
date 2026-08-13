#!/usr/bin/env python3
"""Generate a distinct, safe-area-friendly PNG icon set for every tracker PWA."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
CATALOG = json.loads((ROOT / "pwa-catalog.json").read_text(encoding="utf-8"))
FONT_PATHS = [
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
]


def rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in FONT_PATHS:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size=size, index=1)
    return ImageFont.load_default(size=size)


def fitted_font(draw: ImageDraw.ImageDraw, label: str, maximum: int, target_width: int):
    size = maximum
    while size > 24:
        selected = font(size)
        box = draw.textbbox((0, 0), label, font=selected, stroke_width=max(1, size // 45))
        if box[2] - box[0] <= target_width:
            return selected
        size -= 4
    return font(size)


def make_icon(entry: dict[str, object], size: int, maskable: bool = False) -> Image.Image:
    start = rgb(str(entry["gradientStart"]))
    end = rgb(str(entry["gradientEnd"]))
    accent = rgb(str(entry["themeColor"]))
    image = Image.new("RGB", (size, size), start)
    pixels = image.load()
    for y in range(size):
        ratio = y / max(size - 1, 1)
        row = tuple(round(start[channel] * (1 - ratio) + end[channel] * ratio) for channel in range(3))
        for x in range(size):
            pixels[x, y] = row

    draw = ImageDraw.Draw(image)
    inset = round(size * (0.18 if maskable else 0.12))
    shadow_offset = max(2, size // 80)
    draw.ellipse(
        (inset, inset + shadow_offset, size - inset, size - inset + shadow_offset),
        fill=tuple(max(0, channel - 14) for channel in end),
    )
    draw.ellipse((inset, inset, size - inset, size - inset), fill=(255, 253, 248))

    label = str(entry["iconLabel"])
    selected_font = fitted_font(draw, label, round(size * 0.27), round(size * 0.52))
    stroke = max(1, size // 90)
    box = draw.textbbox((0, 0), label, font=selected_font, stroke_width=stroke)
    width, height = box[2] - box[0], box[3] - box[1]
    position = ((size - width) / 2 - box[0], (size - height) / 2 - box[1])
    draw.text(position, label, font=selected_font, fill=accent, stroke_width=stroke, stroke_fill=accent)
    return image


for app in CATALOG:
    slug = str(app["slug"])
    icon_dir = ROOT / slug / "icons"
    icon_dir.mkdir(parents=True, exist_ok=True)
    for size in (180, 192, 512):
        suffix = "apple-touch-180" if size == 180 else str(size)
        make_icon(app, size).save(icon_dir / f"{slug}-{suffix}.png", optimize=True)
    make_icon(app, 512, maskable=True).save(icon_dir / f"{slug}-maskable-512.png", optimize=True)

print(f"Generated icons for {len(CATALOG)} standalone PWAs.")
