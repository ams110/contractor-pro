import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { C } from '../../constants/index.js'

// ─── مشهد الهيرو WebGL (Three.js) ─────────────────────────────────────────────
// «ورشة بناء حيّة» بهوية amber: برج ينبني طابقاً-طابقاً مع تقدّم السكرول،
// رافعة تعمل بلا توقّف، عملات رواتب ذهبية تدور حول البرج بمشهد الرواتب،
// ومخطّط أرباح ثلاثي الأبعاد ينمو بالمشهد الأخير — والكاميرا تطير بين المشاهد.
//
// progress: MotionValue من useScroll في LandingPage — يُقرأ بـ.get() داخل
// useFrame مباشرة (بلا setState ولا re-render — كل الحركة على الـGPU/RAF).
// الملف يُحمَّل lazy حتى ما يثقّل فتح الصفحة (three بchunk مستقل).

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3)

// ─── الحالة المشتركة — تُحدَّث مرة كل فريم ويقرأها كل عنصر ────────────────────
function Driver({ progress, shared }) {
  useFrame((state) => {
    const v = clamp01(progress?.get?.() ?? 0)
    shared.p = v
    shared.t = state.clock.elapsedTime
    // البرج مبني جزئياً بالهيرو، وينبني بالكامل خلال مشهد «أيام الشغل»
    shared.build = 0.34 + 0.66 * smooth(0.26, 0.47, v)
    // عملات الرواتب تظهر بمشهد «الرواتب» فقط
    shared.coins = smooth(0.5, 0.58, v) * (1 - smooth(0.71, 0.78, v))
    // مخطّط الأرباح ينمو بالمشهد الأخير ويبقى
    shared.bars = smooth(0.76, 0.92, v)
  })
  return null
}

// ─── البرج — طوابق تنزل من السماء وتتصلّب من هولوغرام لخرسانة ─────────────────
const FLOORS = 5
const BLOCK = 1.35
const GAP = 0.14
const BLOCKS = []
{
  let i = 0
  for (let f = 0; f < FLOORS; f++)
    for (let z = 0; z < 2; z++)
      for (let x = 0; x < 2; x++)
        BLOCKS.push({
          i: i++,
          pos: [(x - 0.5) * (BLOCK + GAP), f * (BLOCK + GAP) + BLOCK / 2, (z - 0.5) * (BLOCK + GAP)],
        })
}
const TOTAL = BLOCKS.length
const BOX_GEOM = new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK)
const EDGE_GEOM = new THREE.EdgesGeometry(BOX_GEOM)

function Block({ i, pos, shared }) {
  const grp = useRef()
  const solidMat = useRef()
  const holoMat = useRef()
  useFrame(() => {
    const g = grp.current
    if (!g) return
    // appear ∈ [0,1]: كل مكعّب يظهر بدوره حسب build (تتابع طابقي)
    const a = clamp01((shared.build * (TOTAL + 3) - i) / 3)
    const e = easeOut(a)
    g.visible = a > 0.002
    g.position.set(pos[0], pos[1] + (1 - e) * 3.4, pos[2])
    g.scale.setScalar(0.35 + 0.65 * e)
    // يبدأ هولوغرام سلكي amber ويتصلّب لكتلة معتمة (يبقى خيط توهّج خفيف)
    if (solidMat.current) solidMat.current.opacity = e
    if (holoMat.current) holoMat.current.opacity = 0.9 - 0.65 * e
  })
  return (
    <group ref={grp} visible={false}>
      <mesh geometry={BOX_GEOM}>
        <meshStandardMaterial ref={solidMat} color={C.card} roughness={0.3} metalness={0.55}
          emissive={C.primary} emissiveIntensity={0.06} transparent opacity={0} />
      </mesh>
      <lineSegments geometry={EDGE_GEOM}>
        <lineBasicMaterial ref={holoMat} color={C.primary} transparent opacity={0.9} />
      </lineSegments>
    </group>
  )
}

function Tower({ shared }) {
  const beacon = useRef()
  const topY = FLOORS * (BLOCK + GAP) + 0.32
  useFrame(() => {
    const b = beacon.current
    if (!b) return
    const k = smooth(0.93, 1, shared.build)
    b.visible = k > 0.01
    const pulse = 1 + Math.sin(shared.t * 3) * 0.25
    b.scale.setScalar(k * pulse)
  })
  return (
    <group>
      {BLOCKS.map((blk) => <Block key={blk.i} i={blk.i} pos={blk.pos} shared={shared} />)}
      {/* منارة القمة — تنبض لما يكتمل البناء */}
      <mesh ref={beacon} position={[0, topY, 0]} visible={false}>
        <sphereGeometry args={[0.17, 16, 16]} />
        <meshStandardMaterial color={C.primary} emissive={C.primary} emissiveIntensity={2.2} />
      </mesh>
    </group>
  )
}

// ─── الرافعة — تدور وتمدّ الكيبل بلا توقّف، وخطافها يحمل التلفون الحي ─────────
// phoneRef: عنصر DOM (التلفون الحي) يُزامَن مع موضع الخطاف كل فريم عبر إسقاط
// إحداثيات العالم لإحداثيات الشاشة — التطبيق يبقى DOM حقيقياً (عدادات تعدّ
// ومخطّط ينمو) معلّقاً جوّا المشهد الثلاثي.
const HOOK_TMP = new THREE.Vector3()
const HOOK_PROJ = new THREE.Vector3()
function Crane({ shared, phoneRef, low }) {
  const slew = useRef()
  const trolley = useRef()
  const cable = useRef()
  const hook = useRef()
  useFrame(({ camera, size }) => {
    const t = shared.t
    // الذراع مائلة نحو الكاميرا وبعيدة عن البرج — حتى ما يتداخل التلفون المعلّق معه
    if (slew.current) slew.current.rotation.y = Math.sin(t * 0.16) * 0.45 - 1.2
    if (trolley.current) trolley.current.position.x = 1.5 + Math.sin(t * 0.23 + 1) * 1.1
    // كيبل أهدأ — في حمولة ثمينة معلّقة فيه. بمشهد العنوان (p≈0) أطول حتى
    // يتدلّى التلفون بعيداً عن النص المركزي، ويرتفع لما تبدأ المشاهد.
    const len = 2.4 + Math.sin(t * 0.3) * 0.5 + 1.2 * (1 - smooth(0.12, 0.26, shared.p))
    if (cable.current) { cable.current.scale.y = len; cable.current.position.y = -len / 2 }
    if (hook.current) hook.current.position.y = -len

    // مزامنة التلفون المعلّق: إسقاط موضع الخطاف على الشاشة + مقياس حسب البعد
    const el = phoneRef?.current
    if (el && hook.current) {
      hook.current.getWorldPosition(HOOK_TMP)
      HOOK_TMP.y -= 0.14                              // التعليق أسفل الخطاف
      const dist = camera.position.distanceTo(HOOK_TMP)
      HOOK_PROJ.copy(HOOK_TMP).project(camera)
      if (HOOK_PROJ.z < 1) {
        const x = (HOOK_PROJ.x * 0.5 + 0.5) * size.width
        const y = (-HOOK_PROJ.y * 0.5 + 0.5) * size.height
        const scale = Math.min(1, Math.max(0.24, 8.2 / dist)) * (low ? 0.58 : 1)
        const sway = Math.sin(t * 0.7) * 2.6           // تأرجح بندولي خفيف
        el.style.visibility = 'visible'
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, 0) rotate(${sway}deg) scale(${scale})`
      } else {
        el.style.visibility = 'hidden'
      }
    }
  })
  const steel = { color: C.primary, roughness: 0.4, metalness: 0.45, emissive: C.primary, emissiveIntensity: 0.22 }
  return (
    <group position={[-3.7, 0, -1.5]}>
      <group ref={slew}>
        {/* الصاري + الكابينة */}
        <mesh position={[0, 3.9, 0]}><boxGeometry args={[0.22, 7.8, 0.22]} /><meshStandardMaterial {...steel} /></mesh>
        <mesh position={[0, 7.95, 0]}><boxGeometry args={[0.55, 0.5, 0.55]} /><meshStandardMaterial color={C.card} roughness={0.3} metalness={0.6} emissive={C.primary} emissiveIntensity={0.12} /></mesh>
        {/* الذراع الأمامية + الخلفية + ثقل الموازنة */}
        <mesh position={[1.95, 8.3, 0]}><boxGeometry args={[4.4, 0.18, 0.18]} /><meshStandardMaterial {...steel} /></mesh>
        <mesh position={[-1.2, 8.3, 0]}><boxGeometry args={[1.7, 0.18, 0.18]} /><meshStandardMaterial {...steel} /></mesh>
        <mesh position={[-1.9, 7.9, 0]}><boxGeometry args={[0.5, 0.62, 0.5]} /><meshStandardMaterial color={C.card} roughness={0.35} metalness={0.55} /></mesh>
        {/* العربة + الكيبل + الخطاف */}
        <group ref={trolley} position={[1.5, 8.15, 0]}>
          <mesh ref={cable} position={[0, -1.35, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 1, 4]} />
            <meshBasicMaterial color={C.gold} />
          </mesh>
          <mesh ref={hook} position={[0, -2.7, 0]}>
            <boxGeometry args={[0.24, 0.24, 0.24]} />
            <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={0.6} roughness={0.3} metalness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ─── عملات الرواتب — حلقة ذهبية تدور حول البرج بمشهد الرواتب ──────────────────
const COINS = Array.from({ length: 12 }, (_, i) => ({
  a0: (i / 12) * Math.PI * 2,
  h: 1.7 + (i % 4) * 1.15,
  r: 3.1 + (i % 3) * 0.45,
  sp: 0.4 + (i % 3) * 0.13,
}))
function Coins({ shared }) {
  const grp = useRef()
  const refs = useRef([])
  useFrame(() => {
    const k = shared.coins
    if (!grp.current) return
    grp.current.visible = k > 0.01
    if (k <= 0.01) return
    COINS.forEach((c, i) => {
      const m = refs.current[i]
      if (!m) return
      const a = c.a0 + shared.t * c.sp
      m.position.set(Math.cos(a) * c.r, c.h + Math.sin(shared.t * 1.3 + i) * 0.25, Math.sin(a) * c.r)
      m.rotation.set(Math.PI / 2, 0, a * 2)
      m.scale.setScalar(k)
    })
  })
  return (
    <group ref={grp} visible={false}>
      {COINS.map((c, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }}>
          <cylinderGeometry args={[0.27, 0.27, 0.07, 20]} />
          <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={0.75} roughness={0.25} metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ─── مخطّط الأرباح 3D — أعمدة تنمو بتدرّج amber→أخضر بالمشهد الأخير ──────────
const BARS = [0.6, 0.95, 0.8, 1.35, 1.2, 1.75, 2.3]
const BAR_COLORS = BARS.map((_, i) =>
  new THREE.Color(C.primary).lerp(new THREE.Color(C.success), i / (BARS.length - 1)))
function Bars({ shared }) {
  const grp = useRef()
  const refs = useRef([])
  useFrame(() => {
    const k = shared.bars
    if (!grp.current) return
    grp.current.visible = k > 0.01
    if (k <= 0.01) return
    BARS.forEach((h, i) => {
      const m = refs.current[i]
      if (!m) return
      const kk = clamp01(k * 2.1 - i * 0.16)            // نموّ متتابع عمود-عمود
      const hh = Math.max(0.001, h * easeOut(kk))
      m.scale.y = hh
      m.position.y = hh / 2
    })
  })
  return (
    <group ref={grp} position={[2.7, 0, 2.7]} rotation={[0, -0.55, 0]} visible={false}>
      {BARS.map((h, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }} position={[i * 0.56, 0.001, 0]} scale={[1, 0.001, 1]}>
          <boxGeometry args={[0.42, 1, 0.42]} />
          <meshStandardMaterial color={BAR_COLORS[i]} emissive={BAR_COLORS[i]} emissiveIntensity={0.45} roughness={0.35} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// ─── غبار مضيء يصعد ببطء (amber/بنفسجي/سماوي) ────────────────────────────────
function Particles({ count, shared }) {
  const geo = useRef()
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const sp = new Float32Array(count)
    const palette = [C.primary, C.secondary, C.cyan].map((c) => new THREE.Color(c))
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 19
      pos[i * 3 + 1] = Math.random() * 9.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15
      const c = palette[i % 3]
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
      sp[i] = 0.25 + Math.random() * 0.6
    }
    return { pos, col, sp }
  }, [count])
  useFrame((_, dt) => {
    const attr = geo.current?.attributes?.position
    if (!attr) return
    for (let i = 0; i < count; i++) {
      let y = attr.array[i * 3 + 1] + data.sp[i] * Math.min(dt, 0.05)
      if (y > 9.5) y = 0
      attr.array[i * 3 + 1] = y
    }
    attr.needsUpdate = true
  })
  // shared غير مستعمل هنا لكنه يُمرَّر اتساقاً مع باقي العناصر
  void shared
  return (
    <points>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" count={count} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={data.col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.07} vertexColors transparent opacity={0.75} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

// ─── الكاميرا — مسار keyframes مربوط بالسكرول + انجراف حي + بارالاكس الماوس ───
const KEYS = [
  { p: 0.00, pos: new THREE.Vector3(0, 3.6, 11.6), look: new THREE.Vector3(0, 2.8, 0) },     // الهيرو: واجهة الورشة
  { p: 0.24, pos: new THREE.Vector3(4.8, 3.4, 9.2), look: new THREE.Vector3(-0.4, 3.0, 0) }, // مشهد 1: قريب من البرج وهو ينبني
  { p: 0.50, pos: new THREE.Vector3(9.2, 5.6, 6.2), look: new THREE.Vector3(-0.6, 3.2, 0) }, // مشهد 2: مدار العملات
  { p: 0.76, pos: new THREE.Vector3(-7.2, 4.6, 7.2), look: new THREE.Vector3(0.4, 3.2, 0) }, // انتقال من جهة الرافعة
  { p: 1.001, pos: new THREE.Vector3(1.2, 6.0, 11.6), look: new THREE.Vector3(1.5, 2.1, 1.2) }, // مشهد 3: مخطّط الأرباح (+التلفون عاليسار)
]
function Rig({ shared, mouse }) {
  const { camera } = useThree()
  const cur = useMemo(() => ({
    pos: new THREE.Vector3().copy(KEYS[0].pos),
    look: new THREE.Vector3().copy(KEYS[0].look),
    tp: new THREE.Vector3(), tl: new THREE.Vector3(),
  }), [])
  useFrame((_, dt) => {
    const v = clamp01(shared.p)
    let k = 0
    while (k < KEYS.length - 2 && v > KEYS[k + 1].p) k++
    const A = KEYS[k], B = KEYS[k + 1]
    const f = smooth(A.p, B.p, v)
    cur.tp.lerpVectors(A.pos, B.pos, f)
    cur.tl.lerpVectors(A.look, B.look, f)
    // انجراف حي خفيف + بارالاكس الماوس
    const t = shared.t
    const mx = mouse?.current?.x || 0
    const my = mouse?.current?.y || 0
    cur.tp.x += Math.sin(t * 0.3) * 0.25 + mx * 0.8
    cur.tp.y += Math.cos(t * 0.23) * 0.15 - my * 0.5
    // تنعيم مستقل عن معدّل الفريمات
    const lam = 3.2
    cur.pos.x = THREE.MathUtils.damp(cur.pos.x, cur.tp.x, lam, dt)
    cur.pos.y = THREE.MathUtils.damp(cur.pos.y, cur.tp.y, lam, dt)
    cur.pos.z = THREE.MathUtils.damp(cur.pos.z, cur.tp.z, lam, dt)
    cur.look.x = THREE.MathUtils.damp(cur.look.x, cur.tl.x, lam, dt)
    cur.look.y = THREE.MathUtils.damp(cur.look.y, cur.tl.y, lam, dt)
    cur.look.z = THREE.MathUtils.damp(cur.look.z, cur.tl.z, lam, dt)
    camera.position.copy(cur.pos)
    camera.lookAt(cur.look)
  })
  return null
}

// ─── المشهد الكامل ────────────────────────────────────────────────────────────
// phone: عنصر React (PhoneMockup الحي) يُمرَّر من LandingPage — يُعلَّق على
// خطاف الرافعة كـDOM overlay فوق الـCanvas (يتفادى استيراداً دائرياً).
export default function HeroScene({ progress, mouse, low = false, phone = null }) {
  const shared = useMemo(() => ({ p: 0, t: 0, build: 0.34, coins: 0, bars: 0 }), [])
  const phoneRef = useRef(null)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Canvas
        dpr={low ? [1, 1.6] : [1, 2]}
        gl={{ antialias: !low, powerPreference: 'high-performance' }}
        camera={{ fov: low ? 54 : 42, near: 0.1, far: 70, position: [0, 3.6, 11.6] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={[C.bg]} />
        <fog attach="fog" args={[C.bg, 15, 42]} />
        <Driver progress={progress} shared={shared} />
        <Rig shared={shared} mouse={mouse} />

        {/* إضاءة بهوية amber/بنفسجي/سماوي */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 10, 5]} intensity={1.5} color="#FFE9D6" />
        <pointLight position={[5, 6, 5]} intensity={90} color={C.primary} />
        <pointLight position={[-6, 5, -3]} intensity={70} color={C.secondary} />
        <pointLight position={[0, 2.5, 6.5]} intensity={36} color={C.cyan} />

        <Tower shared={shared} />
        <Crane shared={shared} phoneRef={phoneRef} low={low} />
        <Coins shared={shared} />
        <Bars shared={shared} />
        <Particles count={low ? 120 : 220} shared={shared} />

        {/* الأرضية + شبكة الورشة */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color={C.surface} roughness={0.9} metalness={0.1} />
        </mesh>
        <gridHelper args={[60, 48, C.primary, '#241B3D']} position={[0, 0.01, 0]} material-transparent material-opacity={0.3} />
      </Canvas>

      {/* التلفون الحي معلّق على الخطاف — transform يُكتب مباشرة من useFrame */}
      {phone && (
        <div ref={phoneRef} style={{
          position: 'absolute', top: 0, left: 0, visibility: 'hidden',
          transformOrigin: 'top center', willChange: 'transform', pointerEvents: 'none',
        }}>
          {/* مشبك التعليق: حبلان للزاويتين + عارضة ذهبية */}
          <div aria-hidden style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 120, height: 30, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', width: 2, height: 12, background: C.gold, transform: 'translateX(-50%)' }} />
              <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 120, height: 3, borderRadius: 2, background: C.gold, boxShadow: `0 0 10px ${C.gold}88` }} />
              <div style={{ position: 'absolute', top: 13, left: 8, width: 2, height: 17, background: `${C.gold}AA`, transform: 'rotate(-14deg)', transformOrigin: 'top' }} />
              <div style={{ position: 'absolute', top: 13, right: 8, width: 2, height: 17, background: `${C.gold}AA`, transform: 'rotate(14deg)', transformOrigin: 'top' }} />
            </div>
          </div>
          {phone}
        </div>
      )}
    </div>
  )
}
