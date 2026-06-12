#!/usr/bin/env python3
"""Generate PWA icons — HardHat on orange-red gradient (matches landing page logo).

ROOT FIX: the HardHat shape is read at build time from the SAME source the app
renders (lucide-react in node_modules), instead of being hand-copied here. That
makes the icon always identical to the landing-page logo, and it auto-tracks any
future Lucide redesign on regeneration — no silent drift, no stale custom paths.
"""

import cairosvg, os, re

# Source of truth: the icon node array shipped by lucide-react (same package the
# app imports `HardHat` from). We parse `__iconNode` so the SVG geometry can never
# diverge from what <HardHat/> draws in LandingPage.jsx.
LUCIDE_HARDHAT = os.path.join(
    os.path.dirname(__file__),
    "node_modules/lucide-react/dist/esm/icons/hard-hat.mjs",
)


def load_hardhat_inner():
    """Return the inner SVG markup of the Lucide HardHat (paths + rect), as a
    string in 24-unit space, by parsing lucide-react's __iconNode array."""
    with open(LUCIDE_HARDHAT, encoding="utf-8") as fh:
        src = fh.read()
    parts = []
    # Each element looks like:  ["tag", { attr: "value", ... }]
    for tag, body in re.findall(r'\[\s*"(\w+)"\s*,\s*\{([^}]*)\}\s*\]', src):
        attrs = dict(re.findall(r'(\w+)\s*:\s*"([^"]*)"', body))
        attrs.pop("key", None)  # presentational only in React
        attr_str = " ".join(f'{k}="{v}"' for k, v in attrs.items())
        parts.append(f"<{tag} {attr_str}/>")
    if not parts:
        raise RuntimeError(f"Could not parse HardHat icon node from {LUCIDE_HARDHAT}")
    return "\n    ".join(parts)


# Cached once; identical for every size.
HARDHAT_INNER = load_hardhat_inner()


def make_svg(size):
    # Logo spec mirrored from LandingPage.jsx hero logo:
    #   background : linear-gradient(135deg, #F97316, #DC2626)  (GRAD.brand)
    #   box 76 / borderRadius 24      → corner ≈ 0.316 * size
    #   HardHat 36 centered, white, strokeWidth 2.2, stroke scales with the icon
    r = size  # viewBox size
    corner = round(r * 0.316)            # 24/76 — matches landing logo roundness

    # Hat fills 36 of the 76 box (lucide size 36, viewBox 24) → centered
    hat = r * 36 / 76
    pad = (r - hat) / 2
    scale = hat / 24

    grad_id = "bg"

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg"
     width="{r}" height="{r}" viewBox="0 0 {r} {r}">
  <defs>
    <linearGradient id="{grad_id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#F97316"/>
      <stop offset="100%" stop-color="#DC2626"/>
    </linearGradient>
  </defs>

  <!-- Gradient background (GRAD.brand) -->
  <rect width="{r}" height="{r}" rx="{corner}" ry="{corner}" fill="url(#{grad_id})"/>

  <!-- HardHat icon — geometry sourced live from lucide-react (see load_hardhat_inner) -->
  <g transform="translate({pad:.2f},{pad:.2f}) scale({scale:.4f})"
     fill="none" stroke="white" stroke-width="2.2"
     stroke-linecap="round" stroke-linejoin="round">
    {HARDHAT_INNER}
  </g>
</svg>"""
    return svg

def make_maskable_svg(size):
    # Android "maskable" icon: the launcher crops it to its own shape (circle,
    # squircle, teardrop...), so the gradient must be FULL-BLEED (edge to edge,
    # no rounded corners) and all content must sit inside the central "safe zone"
    # — a circle of 80% diameter. We center the HardHat at ~52% of the icon so it
    # never clips under any mask. Same Lucide geometry as make_svg (single source).
    r = size
    hat = r * 0.52            # smaller than make_svg → stays inside the safe circle
    pad = (r - hat) / 2
    scale = hat / 24
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg"
     width="{r}" height="{r}" viewBox="0 0 {r} {r}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#F97316"/>
      <stop offset="100%" stop-color="#DC2626"/>
    </linearGradient>
  </defs>
  <!-- Full-bleed gradient, NO rounded corners (launcher applies the mask) -->
  <rect width="{r}" height="{r}" fill="url(#bg)"/>
  <g transform="translate({pad:.2f},{pad:.2f}) scale({scale:.4f})"
     fill="none" stroke="white" stroke-width="2.2"
     stroke-linecap="round" stroke-linejoin="round">
    {HARDHAT_INNER}
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

    # --- Regular icons (rounded squircle, purpose "any") — rendered natively from
    #     vector at every size, so all are pixel-crisp (no upscaling). ---
    save(1024, os.path.join(out, "icon-1024.png"))   # App Store / Play Store listing
    save(512,  os.path.join(out, "pwa-512.png"))     # PWA + Play Store
    save(384,  os.path.join(out, "pwa-384.png"))     # PWA
    save(192,  os.path.join(out, "pwa-192.png"))     # PWA
    save(180,  os.path.join(out, "apple-touch-icon.png"))  # iOS home screen
    save(167,  os.path.join(out, "icon-167.png"))    # iPad Pro
    save(152,  os.path.join(out, "icon-152.png"))    # iPad
    save(120,  os.path.join(out, "icon-120.png"))    # iPhone

    # --- Maskable icons (full-bleed, safe-zone hat) for Android adaptive icons ---
    save(512, os.path.join(out, "maskable-512.png"), make_maskable_svg)
    save(192, os.path.join(out, "maskable-192.png"), make_maskable_svg)

    # --- Notification badge (custom solid silhouette, legible at ~24dp) ---
    save(96, os.path.join(out, "badge-96.png"), make_badge_svg)

    # --- Browser favicon (multi-res .ico) ---
    save_favicon(os.path.join(out, "favicon.ico"))
    print("Done!")
