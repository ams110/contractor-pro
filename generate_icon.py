#!/usr/bin/env python3
"""Generate PWA / app icons — white HardHat on an orange-red squircle that
floats (with margin) on a dark backdrop, matching the brand logo used across
the app."""

import cairosvg, os

def make_svg(size):
    # Brand app icon:
    #   • dark backdrop (subtle radial + soft amber bloom)
    #   • centered orange→red rounded-square (squircle) with a margin around it
    #   • white Lucide HardHat centered inside the squircle
    r = size
    sq = r * 0.70                 # squircle side (leaves ~15% margin each side)
    off = (r - sq) / 2            # centered offset
    corner = sq * 0.30            # iOS-like soft corners

    hh = sq * 0.56                # hard hat ≈ 56% of the squircle
    hscale = hh / 24              # Lucide is authored in a 24-unit box
    hx = (r - hh) / 2
    hy = (r - hh) / 2

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg"
     width="{r}" height="{r}" viewBox="0 0 {r} {r}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="78%">
      <stop offset="0%"   stop-color="#191320"/>
      <stop offset="55%"  stop-color="#0B0C13"/>
      <stop offset="100%" stop-color="#07080D"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#F97316" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#F97316" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sq" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#F97316"/>
      <stop offset="100%" stop-color="#DC2626"/>
    </linearGradient>
  </defs>

  <!-- Dark backdrop -->
  <rect width="{r}" height="{r}" fill="url(#bg)"/>
  <!-- Soft amber bloom behind the squircle -->
  <rect width="{r}" height="{r}" fill="url(#glow)"/>

  <!-- Orange squircle (the floating brand tile) -->
  <rect x="{off:.1f}" y="{off:.1f}" width="{sq:.1f}" height="{sq:.1f}"
        rx="{corner:.1f}" ry="{corner:.1f}" fill="url(#sq)"/>

  <!-- HardHat icon (Lucide), white, centered inside the squircle -->
  <g transform="translate({hx:.1f},{hy:.1f}) scale({hscale:.4f})"
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
    # Multi-resolution .ico (16/32/48) from the brand logo.
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
    save(180, os.path.join(out, "apple-touch-icon.png"))
    save(96,  os.path.join(out, "badge-96.png"), make_badge_svg)
    save_favicon(os.path.join(out, "favicon.ico"))
    print("Done!")
