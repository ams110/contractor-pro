# وصفات 3D UI الجاهزة — Contractor Pro

10 وصفات توليد (برومبتات إنجليزية كاملة، جاهزة للنسخ لـ`generate_image`) + قسم CSS 3D.
**ثوابت لكل الوصفات**: مرّر سكرينشوت التطبيق كمرجع + أضف دائماً:
`The phone screen must display exactly the provided UI screenshot, unaltered, sharp and readable. No text anywhere else in the image. No watermarks.`

> 🎨 لغة الإضاءة الموحّدة: dark charcoal environment (#07080F family), warm amber-orange key light (#F97316), deep red rim light (#DC2626), subtle violet bounce (#7C3AED), thin cyan accents (#06B6D4). Cinematic, premium, high contrast.

---

## 1) Floating Glass Phone — الهاتف الزجاجي الطافي (البطل الافتراضي)
```
Premium 3D product render of a modern smartphone floating in a dark charcoal void,
slightly tilted (15° yaw, 8° pitch), screen glowing and facing camera.
Frosted-glass panels and thin glowing orange UI cards hover around the phone at
different depths, casting soft shadows. Warm amber-orange key light from top right,
deep red rim light on the phone edge, faint violet bounce from below.
Volumetric light rays, subtle floating dust particles, soft reflection on a glossy
dark floor. Octane render style, 8k, shallow depth of field.
Vertical 9:16 composition, phone in lower two-thirds, empty dark space at top for headline.
```

## 2) Exploded UI Layers — طبقات الواجهة المنفجرة
```
3D exploded view of a mobile app interface: the phone lies at the bottom and
translucent UI layers (cards, charts, buttons) lift off the screen and float upward
in a staggered stack, each layer separated by glowing orange light gaps.
Isometric-like camera, dark background, warm amber lighting with red accents,
glass and matte-black materials, crisp edges, cinematic depth of field. 9:16.
```

## 3) Isometric Construction Diorama — ديوراما المقاول الأيزومترية
```
Isometric 3D diorama: a miniature construction site (crane, scaffolding, tiny workers
with safety helmets, concrete mixer) built on top of a giant floating smartphone
showing the app dashboard. The site elements connect to the screen with thin glowing
orange lines and floating holographic markers. Dark scene, warm site floodlights,
orange safety-vest color pops, detailed miniature style, tilt-shift, 8k. 1:1 square.
```

## 4) Holographic Dashboard — لوحة تحكّم هولوغرامية فوق كف اليد
```
A construction contractor's rough hand (work glove, hi-vis sleeve) holding a phone
from which a holographic 3D dashboard projects upward: glowing orange bar charts,
a circular gauge, floating shekel ₪ coins as 3D objects. Dark blurred construction
site at night in the background, bokeh site lights, volumetric hologram glow,
photorealistic hand + CGI hologram mix. 9:16, hologram in top half.
```

## 5) Glass Card Stack — برج البطاقات الزجاجية
```
A vertical stack of 4 frosted-glass 3D cards floating in dark space, slightly fanned,
each card an app UI card (stat card, worker card, project card) with a glowing orange
edge light. The stack casts long soft shadows; a warm spotlight cone from above.
Minimal, luxurious, Apple-keynote style product shot. 4:5 composition.
```

## 6) Phone Portal — الهاتف بوّابة لموقع البناء
```
Surreal 3D scene: a giant smartphone standing upright like a doorway in a dark void;
through the screen you see a bright, sunlit construction site in full color —
the screen is a portal. Orange light spills from the portal edges onto the dark floor.
A silhouetted contractor walks toward it. Cinematic, dramatic scale contrast, 9:16.
```

## 7) Money Flow Machine — آلة تدفّق المصاري
```
3D mechanical illustration: shekel coins and bills flow on a conveyor into a
glowing machine shaped like a smartphone, and exit sorted into neat glass jars
labeled with simple icons (no text): wallet, chart, safety helmet.
Dark workshop scene, warm orange machine glow, brushed metal + glass materials,
playful but premium, soft depth of field. 1:1.
```

## 8) Before/After Split World — عالم مقسوم
```
One 3D scene split vertically: left half is chaotic — paper receipts, sticky notes
and a messy notebook flying in grey cold light; right half is calm — a floating phone
with a clean glowing dashboard, orange warm light, everything orderly.
A sharp light seam divides the halves. High contrast storytelling, 9:16.
```

## 9) Rocket Chart — صاروخ النمو
```
A 3D bar chart made of concrete blocks grows from a construction site floor;
the tallest bar transforms into a launching rocket with an orange flame trail,
smartphone standing beside it showing the app. Night scene, dramatic underlight,
particles and smoke, cinematic. 9:16, rocket trail leaves top space for headline.
```

## 10) Worker Hologram Roster — روستر العمّال الهولوغرامي
```
3D scene: a phone lies flat and five miniature holographic construction workers
(orange glowing wireframe style) stand on the screen in a row, one waving.
Each has a tiny floating status ring above his helmet. Dark background,
hologram orange-cyan glow, photoreal phone + stylized holograms. 1:1.
```

---

## قسم CSS 3D — كود جاهز (مسار B)

موك-أب هاتف بمنظور + طبقات طافية، يُصوَّر بـ`ad-shots` أو Playwright:

```html
<div style="perspective:1200px; perspective-origin:60% 40%;">
  <div class="phone" style="
      transform: rotateY(-18deg) rotateX(8deg);
      transform-style: preserve-3d;
      border-radius: 44px;
      box-shadow: 0 40px 80px rgba(0,0,0,.55), 0 0 120px rgba(249,115,22,.25);">
    <img src="screen.png" style="border-radius:38px; display:block;"/>
    <!-- لمعة زجاجية -->
    <div style="position:absolute; inset:0; border-radius:38px;
      background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.08) 50%, transparent 60%);"></div>
    <!-- بطاقة طافية قدّام الشاشة -->
    <div class="floatCard" style="
      position:absolute; top:18%; inset-inline-end:-14%;
      transform: translateZ(90px);
      background:#12152A; border:1px solid rgba(249,115,22,.28);
      border-radius:16px; padding:12px 16px;
      box-shadow: 0 24px 48px rgba(0,0,0,.5);"></div>
  </div>
  <!-- انعكاس أرضي -->
  <div style="transform: rotateY(-18deg) rotateX(8deg) scaleY(-1) translateY(-102%);
      opacity:.25; filter: blur(6px);
      mask-image: linear-gradient(to bottom, black, transparent 55%);">
    <img src="screen.png" style="border-radius:38px;"/>
  </div>
</div>
```

نصائح:
- طبقتان–ثلاث طافية كحد أقصى (`translateZ` 60/90/140) — أكثر من هيك فوضى.
- خلفية المشهد: `radial-gradient(80% 60% at 50% 30%, #12152A, #07080F)` + وميض `radial-gradient(circle, rgba(249,115,22,.18), transparent 70%)` وراء الهاتف.
- النص العربي RTL يبقى **خارج** عناصر الـtransform (طبقة عليا مستقيمة) عشان يظل حاداً وقابلاً للقراءة.
