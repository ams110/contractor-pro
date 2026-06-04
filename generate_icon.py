#!/usr/bin/env python3
"""Generate premium PWA icons — glossy HardHat on Amber-Gold gradient squircle.

Design layers (matches Contractor Pro brand identity):
  1. Squircle base with rich amber→orange→red diagonal gradient
  2. Faint blueprint grid (construction feel)
  3. Soft top-light radial glow + glossy top sheen (glass highlight)
  4. Inner vignette for depth + bevel edge (light top / dark bottom)
  5. White HardHat (Lucide) with ambient glow, soft drop shadow, subtle sheen
Output kept within maskable safe-zone (~70% center) so it survives mask cropping.
"""

import cairosvg, os


def make_svg(r):
    corner = round(r * 0.225)          # squircle radius
    cx = r / 2

    # ---- HardHat placement (Lucide 24-unit space), centered in safe zone ----
    hat_box = r * 0.50                 # icon area side (kept small => maskable safe)
    hat_scale = hat_box / 24
    hat_x = (r - hat_box) / 2
    hat_y = (r - hat_box) / 2 + r * 0.015
    sw = 2.55                          # stroke width in 24-unit space
    sh_dy = r * 0.018                  # shadow vertical offset
    blur = r * 0.012                   # shadow blur radius

    hat_paths = (
        '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2H2z"/>'
        '<path d="M20 15a1 1 0 0 0 1-1v-4a8 8 0 1 0-16 0v4a1 1 0 0 0 1 1z"/>'
        '<path d="M9 15v1"/><path d="M15 15v1"/><path d="M12 15v2"/>'
    )

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{r}" height="{r}" viewBox="0 0 {r} {r}">
  <defs>
    <!-- Main brand gradient: amber gold -> orange -> deep red (rich & vivid) -->
    <linearGradient id="bg" x1="5%" y1="0%" x2="95%" y2="100%">
      <stop offset="0%"   stop-color="#FCD34D"/>
      <stop offset="30%"  stop-color="#F59E0B"/>
      <stop offset="62%"  stop-color="#F97316"/>
      <stop offset="86%"  stop-color="#EA1F1F"/>
      <stop offset="100%" stop-color="#B91C1C"/>
    </linearGradient>

    <!-- Top-light radial glow (warm white from upper area) -->
    <radialGradient id="toplight" cx="50%" cy="14%" r="62%">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.30"/>
      <stop offset="50%"  stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Glossy top sheen -->
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>

    <!-- Depth vignette: transparent center -> dark edges -->
    <radialGradient id="vignette" cx="50%" cy="40%" r="70%">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0"/>
      <stop offset="72%"  stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#6B1208" stop-opacity="0.55"/>
    </radialGradient>

    <!-- Ambient glow behind the hat -->
    <radialGradient id="hatglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="60%"  stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Subtle vertical sheen on the white hat strokes -->
    <linearGradient id="hatstroke" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#FFF4E0"/>
    </linearGradient>

    <clipPath id="clip">
      <rect width="{r}" height="{r}" rx="{corner}" ry="{corner}"/>
    </clipPath>

    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="{blur:.2f}"/>
    </filter>
  </defs>

  <!-- ===== Background ===== -->
  <g clip-path="url(#clip)">
    <rect width="{r}" height="{r}" fill="url(#bg)"/>

    <!-- faint blueprint grid -->
    <g stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="{max(1, r*0.0025):.2f}">
      {''.join(f'<line x1="{i*r/8:.1f}" y1="0" x2="{i*r/8:.1f}" y2="{r}"/>' for i in range(1, 8))}
      {''.join(f'<line x1="0" y1="{i*r/8:.1f}" x2="{r}" y2="{i*r/8:.1f}"/>' for i in range(1, 8))}
    </g>

    <rect width="{r}" height="{r}" fill="url(#toplight)"/>
    <!-- glossy sheen on top ~46% -->
    <rect width="{r}" height="{r*0.46:.1f}" fill="url(#sheen)"/>
    <rect width="{r}" height="{r}" fill="url(#vignette)"/>

    <!-- ambient glow behind hat -->
    <circle cx="{cx:.1f}" cy="{r*0.5:.1f}" r="{r*0.34:.1f}" fill="url(#hatglow)"/>

    <!-- ===== HardHat ===== -->
    <!-- drop shadow -->
    <g transform="translate({hat_x:.2f},{hat_y+sh_dy:.2f}) scale({hat_scale:.4f})"
       fill="none" stroke="#5A1505" stroke-opacity="0.45"
       stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"
       filter="url(#soft)">
      {hat_paths}
    </g>
    <!-- main hat -->
    <g transform="translate({hat_x:.2f},{hat_y:.2f}) scale({hat_scale:.4f})"
       fill="none" stroke="url(#hatstroke)"
       stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">
      {hat_paths}
    </g>
  </g>

  <!-- bevel edge: light top, dark bottom -->
  <rect x="{r*0.012:.1f}" y="{r*0.012:.1f}" width="{r*0.976:.1f}" height="{r*0.976:.1f}"
        rx="{corner-2}" ry="{corner-2}" fill="none"
        stroke="#FFFFFF" stroke-opacity="0.30" stroke-width="{max(1.2, r*0.004):.2f}"/>
</svg>'''
    return svg


def make_badge_svg(r):
    """Notification badge: solid white HardHat on transparent bg.
    Android tints by alpha, so it must be a clean monochrome silhouette."""
    box = r * 0.72
    scale = box / 24
    x = (r - box) / 2
    y = (r - box) / 2
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{r}" height="{r}" viewBox="0 0 {r} {r}">
  <g transform="translate({x:.2f},{y:.2f}) scale({scale:.4f})"
     fill="none" stroke="#FFFFFF" stroke-width="2.4"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2H2z"/>
    <path d="M20 15a1 1 0 0 0 1-1v-4a8 8 0 1 0-16 0v4a1 1 0 0 0 1 1z"/>
    <path d="M9 15v1"/><path d="M15 15v1"/><path d="M12 15v2"/>
  </g>
</svg>'''


def save(size, path, svg_fn=make_svg):
    cairosvg.svg2png(bytestring=svg_fn(size).encode(), write_to=path,
                     output_width=size, output_height=size)
    print(f"Saved {path} ({size}x{size})")


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
    save(512, os.path.join(out, "pwa-512.png"))
    save(192, os.path.join(out, "pwa-192.png"))
    save(180, os.path.join(out, "apple-touch-icon.png"))
    save(96,  os.path.join(out, "badge-96.png"), make_badge_svg)
    print("Done!")
