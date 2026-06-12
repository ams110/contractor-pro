#!/usr/bin/env python3
"""Generate PWA icons — HardHat on orange-red gradient (matches landing page logo)"""

import cairosvg, os

def make_svg(size):
    # Logo exact spec from LandingPage.jsx:
    #   background: linear-gradient(135deg, #F97316, #DC2626)
    #   borderRadius: 13px (scaled to icon size)
    #   HardHat lucide icon, white, strokeWidth 2.5, centered

    r = size  # viewBox size
    corner = round(r * 0.20)  # border-radius proportional to 13/64 ≈ 20%

    # Scale the HardHat path from 24-unit space to icon space
    scale = r / 24
    sw = max(1.5, 2.5 * scale)   # stroke-width scaled

    grad_id = "bg"

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="{r}" height="{r}" viewBox="0 0 {r} {r}">
  <defs>
    <linearGradient id="{grad_id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#F97316"/>
      <stop offset="100%" stop-color="#DC2626"/>
    </linearGradient>
    <clipPath id="clip">
      <rect width="{r}" height="{r}" rx="{corner}" ry="{corner}"/>
    </clipPath>
  </defs>

  <!-- Gradient background -->
  <rect width="{r}" height="{r}" rx="{corner}" ry="{corner}" fill="url(#{grad_id})"/>

  <!-- HardHat icon (Lucide), centered, scaled from 24-unit space -->
  <!-- Padding: 18% each side → icon area starts at 0.18*r, size 0.64*r -->
  <g transform="translate({r*0.18:.1f},{r*0.18:.1f}) scale({r*0.64/24:.4f})"
     fill="none" stroke="white" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round">
    <!-- Bottom brim -->
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2H2z"/>
    <!-- Dome -->
    <path d="M20 15a1 1 0 0 0 1-1v-4a8 8 0 1 0-16 0v4a1 1 0 0 0 1 1z"/>
    <!-- Vent lines -->
    <path d="M9 15v1"/>
    <path d="M15 15v1"/>
    <path d="M12 15v2"/>
  </g>
</svg>"""
    return svg

def make_maskable_svg(size):
    # Maskable icon for Android adaptive icons: the gradient background must
    # bleed to ALL edges (NO rounded corners / no transparency) so any system
    # mask (circle, squircle, square) only ever cuts into the orange — never
    # into a transparent/black corner. The HardHat sits inside the central
    # safe zone (~60%) so it is never clipped by aggressive circular masks.
    r = size
    pad = r * 0.22          # 22% padding each side → logo within central 56%
    inner = r - 2 * pad
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg"
     width="{r}" height="{r}" viewBox="0 0 {r} {r}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#F97316"/>
      <stop offset="100%" stop-color="#DC2626"/>
    </linearGradient>
  </defs>
  <!-- Full-bleed square background (fills every edge & corner) -->
  <rect width="{r}" height="{r}" fill="url(#bg)"/>
  <!-- HardHat icon (Lucide), centered inside the safe zone -->
  <g transform="translate({pad:.1f},{pad:.1f}) scale({inner/24:.4f})"
     fill="none" stroke="white" stroke-width="2.5"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2H2z"/>
    <path d="M20 15a1 1 0 0 0 1-1v-4a8 8 0 1 0-16 0v4a1 1 0 0 0 1 1z"/>
    <path d="M9 15v1"/>
    <path d="M15 15v1"/>
    <path d="M12 15v2"/>
  </g>
</svg>"""
    return svg

def make_badge_svg(size):
    # Notification badge — Android tints by alpha and shrinks to ~24dp, so the
    # standard Lucide HardHat outline reads as an unrecognizable blob there.
    # Instead we draw ONE continuous SOLID hard-hat silhouette: the dome flares
    # smoothly into a curved brim with no gap, which stays legible at tiny size.
    r = size
    # Single filled path in 24-unit space, scaled to fill the icon with margin.
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg"
     width="{r}" height="{r}" viewBox="0 0 {r} {r}">
  <g transform="translate({r*0.085:.2f},{r*0.085:.2f}) scale({r*0.83/24:.4f})"
     fill="white">
    <path d="M12 4.3c-3.9 0-6.7 2.9-6.7 6.8v2.3c-1.4.1-2.8.4-2.8 1.9 0 1.6 1.7 2.1 3.6 2.1h11.8c1.9 0 3.6-.5 3.6-2.1 0-1.5-1.4-1.8-2.8-1.9v-2.3c0-3.9-2.8-6.8-6.7-6.8z"/>
  </g>
</svg>"""
    return svg

def save(size, path, svg_fn=make_svg):
    svg = svg_fn(size)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=path, output_width=size, output_height=size)
    print(f"Saved {path} ({size}x{size})")

def save_favicon(path):
    # Multi-resolution .ico (16/32/48) from the brand gradient logo.
    from io import BytesIO
    from PIL import Image
    base = Image.open(BytesIO(cairosvg.svg2png(
        bytestring=make_svg(256).encode(), output_width=256, output_height=256)))
    base.save(path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"Saved {path} (16/32/48)")

if __name__ == "__main__":
    out = "/home/user/contractor-pro/public"
    save(512, os.path.join(out, "pwa-512.png"))
    save(192, os.path.join(out, "pwa-192.png"))
    save(512, os.path.join(out, "pwa-maskable-512.png"), make_maskable_svg)
    save(180, os.path.join(out, "apple-touch-icon.png"))
    save(96,  os.path.join(out, "badge-96.png"), make_badge_svg)
    save_favicon(os.path.join(out, "favicon.ico"))
    print("Done!")
