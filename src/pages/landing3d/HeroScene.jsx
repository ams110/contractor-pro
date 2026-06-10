import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { C } from '../../constants/index.js'

// ─── ديوراما «المدينة الحيّة» (Three.js) — هيرو صفحة الهبوط ────────────────────
// جزيرة عائمة بالفضاء عليها مدينة مقاول مصغّرة: مبانٍ بشبابيك مضيئة بألوان
// الهوية، شوارع متقاطعة وسيارة تلفّ بلا توقّف، رافعة صغيرة تشتغل، أشجار،
// ونجوم حوالين الجزيرة. الديوراما تدور ببطء وتتمايل مع الماوس — بلا تثبيت
// سكرول: مشهد واحد ساحر بيتنفّس.
//
// يُحمَّل lazy (three بchunk مستقل). useFrame فقط — صفر setState.

const TAU = Math.PI * 2

// ─── بيانات المدينة (ثابتة) ───────────────────────────────────────────────────
// مبانٍ موزّعة على 4 أرباع حول تقاطع شارعين. h=الارتفاع، c=لون الشبابيك.
const BUILDINGS = [
  { x: -2.3, z: -2.2, w: 1.3, d: 1.3, h: 2.9, c: C.primary   },
  { x: -0.9, z: -2.5, w: 0.9, d: 0.9, h: 1.7, c: C.cyan      },
  { x: -2.6, z: -0.8, w: 1.0, d: 1.0, h: 2.2, c: C.gold      },
  { x:  2.2, z: -2.3, w: 1.4, d: 1.2, h: 3.4, c: C.secondary },
  { x:  0.9, z: -2.4, w: 0.8, d: 0.8, h: 1.4, c: C.primary   },
  { x:  2.5, z: -0.9, w: 1.0, d: 1.1, h: 1.9, c: C.cyan      },
  { x: -2.3, z:  2.3, w: 1.2, d: 1.3, h: 2.4, c: C.cyan      },
  { x: -0.9, z:  2.5, w: 0.9, d: 0.8, h: 1.6, c: C.secondary },
  { x:  2.4, z:  2.2, w: 1.3, d: 1.3, h: 2.0, c: C.gold      },
  { x:  1.0, z:  2.5, w: 0.8, d: 0.9, h: 2.7, c: C.primary   },
  { x:  2.6, z:  0.9, w: 0.9, d: 0.9, h: 1.3, c: C.gold      },
]
const TREES = [
  [-1.6, -1.4], [1.5, -1.5], [-1.5, 1.5], [1.6, 1.4], [-2.9, 0.2], [2.9, -0.1],
]

// مبنى واحد: جسم + سطح ملوّن + شرائط شبابيك مضيئة على واجهتين
function Building({ b, i }) {
  const winRef = useRef()
  useFrame(({ clock }) => {
    // وميض حيوي خفيف للشبابيك — كل مبنى بإيقاعه
    if (winRef.current) winRef.current.emissiveIntensity = 1.15 + Math.sin(clock.elapsedTime * 1.3 + i * 2.1) * 0.35
  })
  const floors = Math.max(2, Math.round(b.h / 0.55))
  const strips = []
  for (let f = 0; f < floors; f++) {
    const y = 0.34 + f * (b.h - 0.5) / floors
    strips.push(y)
  }
  return (
    <group position={[b.x, 0, b.z]}>
      {/* الجسم */}
      <mesh position={[0, b.h / 2, 0]} castShadow>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial color="#1C2348" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* السطح */}
      <mesh position={[0, b.h + 0.045, 0]}>
        <boxGeometry args={[b.w * 0.96, 0.09, b.d * 0.96]} />
        <meshStandardMaterial color={b.c} emissive={b.c} emissiveIntensity={0.35} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* شرائط الشبابيك (واجهتان متعامدتان حتى تبان من كل زوايا الدوران) */}
      {strips.map((y, f) => (
        <group key={f}>
          <mesh position={[0, y, b.d / 2 + 0.012]}>
            <boxGeometry args={[b.w * 0.72, 0.16, 0.02]} />
            <meshStandardMaterial ref={f === 0 ? winRef : undefined} color={b.c} emissive={b.c} emissiveIntensity={1.15} toneMapped={false} />
          </mesh>
          <mesh position={[b.w / 2 + 0.012, y, 0]}>
            <boxGeometry args={[0.02, 0.16, b.d * 0.72]} />
            <meshStandardMaterial color={b.c} emissive={b.c} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// شجرة مصغّرة: جذع + كرتي أوراق
function Tree({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.34, 5]} />
        <meshStandardMaterial color="#6B4226" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <sphereGeometry args={[0.21, 8, 8]} />
        <meshStandardMaterial color="#1E8F5A" roughness={0.7} emissive="#1E8F5A" emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0.07, 0.64, 0.04]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial color="#27AE6B" roughness={0.7} emissive="#27AE6B" emissiveIntensity={0.12} />
      </mesh>
    </group>
  )
}

// رافعة صغيرة بزاوية الجزيرة — توقيع «المقاول» — تدور ببطء
function MiniCrane() {
  const slew = useRef()
  useFrame(({ clock }) => {
    if (slew.current) slew.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.9
  })
  const steel = { color: C.primary, roughness: 0.45, metalness: 0.4, emissive: C.primary, emissiveIntensity: 0.3 }
  return (
    <group position={[-0.1, 0, -0.1]} scale={[0.62, 0.62, 0.62]}>
      <group ref={slew}>
        <mesh position={[0, 1.9, 0]}><boxGeometry args={[0.12, 3.8, 0.12]} /><meshStandardMaterial {...steel} /></mesh>
        <mesh position={[0.85, 3.85, 0]}><boxGeometry args={[2.1, 0.1, 0.1]} /><meshStandardMaterial {...steel} /></mesh>
        <mesh position={[-0.55, 3.85, 0]}><boxGeometry args={[0.8, 0.1, 0.1]} /><meshStandardMaterial {...steel} /></mesh>
        <mesh position={[-0.85, 3.65, 0]}><boxGeometry args={[0.26, 0.3, 0.26]} /><meshStandardMaterial color="#1C2348" roughness={0.5} metalness={0.4} /></mesh>
        <mesh position={[1.55, 3.3, 0]}><cylinderGeometry args={[0.012, 0.012, 1.0, 4]} /><meshBasicMaterial color={C.gold} /></mesh>
        <mesh position={[1.55, 2.74, 0]}><boxGeometry args={[0.14, 0.14, 0.14]} /><meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={0.8} /></mesh>
      </group>
    </group>
  )
}

// سيارة صغيرة تلفّ على حلقة الشوارع بلا توقّف
function Car() {
  const grp = useRef()
  useFrame(({ clock }) => {
    const g = grp.current
    if (!g) return
    const t = clock.elapsedTime * 0.35
    // مسار مربّع مدوّر الزوايا حول التقاطع (نصف قطر 1.7 مع تليين)
    const a = (t % 1) * TAU
    const r = 1.72 / Math.pow(Math.abs(Math.cos(a)) ** 6 + Math.abs(Math.sin(a)) ** 6, 1 / 6)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    g.position.set(x, 0.12, z)
    g.rotation.y = -a - Math.PI / 2
  })
  return (
    <group ref={grp}>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.34, 0.12, 0.17]} />
        <meshStandardMaterial color={C.cyan} emissive={C.cyan} emissiveIntensity={0.45} roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0.02, 0.14, 0]}>
        <boxGeometry args={[0.17, 0.08, 0.14]} />
        <meshStandardMaterial color="#0E1430" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* ضوء أمامي متوهّج */}
      <mesh position={[0.18, 0.05, 0]}>
        <boxGeometry args={[0.02, 0.05, 0.12]} />
        <meshStandardMaterial color="#FFF3D6" emissive="#FFF3D6" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  )
}

// الجزيرة: قاعدة + حافة متوهّجة + شوارع + صخرة سفلية مقلوبة
function Island() {
  return (
    <group>
      {/* سطح الجزيرة */}
      <mesh position={[0, -0.14, 0]} receiveShadow>
        <boxGeometry args={[7.4, 0.28, 7.4]} />
        <meshStandardMaterial color="#141A38" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* حافة متوهّجة amber */}
      <mesh position={[0, -0.285, 0]}>
        <boxGeometry args={[7.55, 0.045, 7.55]} />
        <meshStandardMaterial color={C.primary} emissive={C.primary} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* قاع الجزيرة — هرم مقلوب (روح الجزيرة العائمة) */}
      <mesh position={[0, -1.55, 0]} rotation={[Math.PI, Math.PI / 4, 0]}>
        <coneGeometry args={[5.1, 2.5, 4]} />
        <meshStandardMaterial color="#0E1330" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* شارعان متقاطعان */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 0.85]} />
        <meshStandardMaterial color="#0B0F26" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[7.4, 0.85]} />
        <meshStandardMaterial color="#0B0F26" roughness={0.95} />
      </mesh>
      {/* خطوط الشارع المضيئة */}
      {[-2.8, -1.9, 1.9, 2.8].map((p, i) => (
        <group key={i}>
          <mesh position={[p, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.42, 0.05]} />
            <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.012, p]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <planeGeometry args={[0.42, 0.05]} />
            <meshStandardMaterial color={C.gold} emissive={C.gold} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// نجوم/غبار مضيء حول الجزيرة
function Stars({ count }) {
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const palette = ['#FFFFFF', C.primary, C.cyan, C.secondary].map((c) => new THREE.Color(c))
    for (let i = 0; i < count; i++) {
      // قشرة كروية حول المشهد
      const r = 11 + Math.random() * 14
      const th = Math.random() * TAU
      const ph = Math.acos(2 * Math.random() - 1)
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th)
      pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.7 - 2.5
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
      const c = palette[i % palette.length]
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b
    }
    return { pos, col }
  }, [count])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={data.col} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.075} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

// دوران الديوراما + طفو + ميلان مع الماوس
function Rig({ mouse, diorama }) {
  const { camera } = useThree()
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const g = diorama.current
    if (g) {
      g.rotation.y = t * 0.09
      g.position.y = Math.sin(t * 0.5) * 0.14
      // ميلان لطيف نحو المؤشّر
      const mx = mouse?.current?.x || 0
      const my = mouse?.current?.y || 0
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, my * 0.1, 3, dt)
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -mx * 0.08, 3, dt)
    }
    camera.lookAt(0, 0.9, 0)
  })
  return null
}

export default function HeroScene({ mouse, low = false }) {
  const diorama = useRef()
  return (
    <Canvas
      dpr={low ? [1, 1.6] : [1, 2]}
      gl={{ antialias: !low, powerPreference: 'high-performance', alpha: true }}
      camera={{ fov: low ? 50 : 34, near: 0.1, far: 80, position: [8.6, 7.0, 8.6] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* خلفية شفافة — توهّجات الصفحة خلف الـCanvas تبان */}
      <Rig mouse={mouse} diorama={diorama} />

      {/* إضاءة دافئة مشرقة بهوية amber */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#3A3F6E', '#0B0F26', 0.7]} />
      <directionalLight position={[6, 9, 4]} intensity={1.9} color="#FFE2BD" />
      <pointLight position={[-7, 5, -4]} intensity={55} color={C.secondary} />
      <pointLight position={[5, 3, 7]} intensity={40} color={C.cyan} />
      <pointLight position={[0, 5.5, 0]} intensity={28} color={C.primary} />

      <group ref={diorama}>
        <Island />
        {BUILDINGS.map((b, i) => <Building key={i} b={b} i={i} />)}
        {TREES.map(([x, z], i) => <Tree key={i} x={x} z={z} />)}
        <MiniCrane />
        <Car />
      </group>
      <Stars count={low ? 160 : 320} />
    </Canvas>
  )
}
