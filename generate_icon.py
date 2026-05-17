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

def save(size, path):
    svg = make_svg(size)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=path, output_width=size, output_height=size)
    print(f"Saved {path} ({size}x{size})")

if __name__ == "__main__":
    out = "/home/user/contractor-pro/public"
    save(512, os.path.join(out, "pwa-512.png"))
    save(192, os.path.join(out, "pwa-192.png"))
    save(180, os.path.join(out, "apple-touch-icon.png"))
    print("Done!")
