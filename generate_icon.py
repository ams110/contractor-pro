#!/usr/bin/env python3
"""Generate PWA icons for Contractor Pro — Amber Gold Dark theme"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def tri_lerp(c1, c2, c3, t):
    """Three-color gradient"""
    if t < 0.5:
        return lerp_color(c1, c2, t * 2)
    else:
        return lerp_color(c2, c3, (t - 0.5) * 2)

def generate_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    BG = (7, 8, 12)          # #07080C
    C1 = (251, 191, 36)      # #FBBF24 amber-light
    C2 = (245, 158, 11)      # #F59E0B amber
    C3 = (239, 68, 68)       # #EF4444 red

    # --- Background rounded square ---
    r_bg = int(size * 0.22)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r_bg, fill=BG)

    # --- Amber gradient circle ---
    pad = int(size * 0.10)
    cx, cy = size // 2, size // 2
    radius = size // 2 - pad

    # Draw gradient circle pixel by pixel (efficient band approach)
    for y in range(pad, size - pad):
        for x in range(pad, size - pad):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy <= radius * radius:
                # gradient angle 135° → top-left bright, bottom-right dark
                t = (dx + dy + 2 * radius) / (4 * radius)
                t = max(0.0, min(1.0, t))
                color = tri_lerp(C1, C2, C3, t)
                img.putpixel((x, y), color + (255,))

    # --- Inner dark circle (donut shape) ---
    inner_r = int(radius * 0.52)
    for y in range(pad, size - pad):
        for x in range(pad, size - pad):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy <= inner_r * inner_r:
                img.putpixel((x, y), BG + (255,))

    # --- Building icon (white) inside the inner circle ---
    u = size / 512  # scale unit
    white = (255, 255, 255, 255)

    # Building body
    bw = int(90 * u)
    bh = int(110 * u)
    bx = cx - bw // 2
    by = cy - bh // 2 + int(10 * u)
    draw.rectangle([bx, by, bx + bw, by + bh], fill=white)

    # Roof / top triangle (helmet-like top)
    roof_h = int(38 * u)
    roof_pts = [
        (cx, by - roof_h),
        (bx - int(18 * u), by),
        (bx + bw + int(18 * u), by),
    ]
    draw.polygon(roof_pts, fill=white)

    # Windows (dark cutouts)
    win_size = int(16 * u)
    win_gap = int(10 * u)
    # Row 1
    for col in range(3):
        wx = bx + win_gap + col * (win_size + win_gap)
        wy = by + win_gap
        draw.rectangle([wx, wy, wx + win_size, wy + win_size], fill=BG + (255,))
    # Row 2
    for col in range(3):
        wx = bx + win_gap + col * (win_size + win_gap)
        wy = by + win_gap * 2 + win_size
        draw.rectangle([wx, wy, wx + win_size, wy + win_size], fill=BG + (255,))

    # Door
    door_w = int(22 * u)
    door_h = int(32 * u)
    door_x = cx - door_w // 2
    door_y = by + bh - door_h
    draw.rectangle([door_x, door_y, door_x + door_w, door_y + door_h], fill=BG + (255,))

    return img


def save_icon(size, path):
    img = generate_icon(size)
    # Convert to RGB PNG (no alpha for PWA icons)
    bg = Image.new("RGB", (size, size), (7, 8, 12))
    bg.paste(img, mask=img.split()[3])
    bg.save(path, "PNG", optimize=True)
    print(f"Saved {path} ({size}x{size})")


if __name__ == "__main__":
    out = "/home/user/contractor-pro/public"
    save_icon(512, os.path.join(out, "pwa-512.png"))
    save_icon(192, os.path.join(out, "pwa-192.png"))
    save_icon(180, os.path.join(out, "apple-touch-icon.png"))
    print("Done!")
