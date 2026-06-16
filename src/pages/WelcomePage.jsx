import React, { useState, useEffect } from 'react'
import { HardHat } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { navigate } from '../Router.jsx'
import { useRouteSeo } from '../lib/seo.js'

// ── Module-level: generated once, never re-randomised on re-render ────────────
const STARS = Array.from({ length: 80 }, () => ({
  x:        Math.random() * 100,
  y:        Math.random() * 100,
  size:     Math.random() * 1.5 + 0.5,
  delay:    Math.random() * 4,
  duration: Math.random() * 2 + 2,
}))

const ORBS = [
  { x: 15, y: 18,  size: 340, color: 'rgba(245,158,11,0.11)', delay: 0,   duration: 7 },
  { x: 82, y: 72,  size: 420, color: 'rgba(249,115,22,0.07)', delay: 1.5, duration: 9 },
  { x: 48, y: 88,  size: 280, color: 'rgba(239,68,68,0.06)',  delay: 3,   duration: 8 },
  { x: 8,  y: 62,  size: 220, color: 'rgba(245,158,11,0.06)', delay: 2,   duration: 6 },
]

const CSS = `
  @keyframes logoBounce {
    0%   { transform:scale(0) translateY(40px); opacity:0 }
    55%  { transform:scale(1.2) translateY(-10px); opacity:1 }
    75%  { transform:scale(0.93) translateY(5px) }
    90%  { transform:scale(1.05) translateY(-2px) }
    100% { transform:scale(1) translateY(0) }
  }
  @keyframes ringPulse {
    0%   { transform:scale(0.8); opacity:0.85 }
    100% { transform:scale(2.1); opacity:0 }
  }
  @keyframes slideUpFade {
    from { transform:translateY(28px); opacity:0 }
    to   { transform:translateY(0);    opacity:1 }
  }
  @keyframes dotBounce {
    0%,80%,100% { transform:translateY(0) }
    40%         { transform:translateY(-14px) }
  }
  @keyframes twinkle {
    0%,100% { opacity:0.12; transform:scale(1) }
    50%     { opacity:0.95; transform:scale(1.6) }
  }
  @keyframes orbFloat {
    0%,100% { transform:translateY(0) scale(1) }
    50%     { transform:translateY(-22px) scale(1.05) }
  }
`

export default function WelcomePage() {
  useRouteSeo('/welcome')
  const { user, loading } = useAuth()
  const [fading, setFading] = useState(false)

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading])

  // Start fade-out at 2.7 s, then navigate at 3.3 s
  useEffect(() => {
    if (!user) return
    const t1 = setTimeout(() => setFading(true), 2700)
    return () => clearTimeout(t1)
  }, [user])

  useEffect(() => {
    if (!fading) return
    const t2 = setTimeout(() => navigate('/app'), 600)
    return () => clearTimeout(t2)
  }, [fading])

  if (loading) return null

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || ''

  return (
    <div
      dir="rtl"
      style={{
        position:        'fixed',
        inset:           0,
        background:      'linear-gradient(135deg, #07080C 0%, #0D0A14 40%, #0A0C10 100%)',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        overflow:        'hidden',
        opacity:         fading ? 0 : 1,
        transition:      fading ? 'opacity 0.6s ease' : 'none',
        zIndex:          9999,
        fontFamily:      'system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{CSS}</style>

      {/* ── Star particles ── */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position:     'absolute',
            left:         `${s.x}%`,
            top:          `${s.y}%`,
            width:        s.size,
            height:       s.size,
            borderRadius: '50%',
            background:   '#F59E0B',
            animation:    `twinkle ${s.duration}s ${s.delay}s ease-in-out infinite`,
            pointerEvents:'none',
          }}
        />
      ))}

      {/* ── Floating orbs ── */}
      {ORBS.map((o, i) => (
        <div
          key={i}
          style={{
            position:     'absolute',
            left:         `calc(${o.x}% - ${o.size / 2}px)`,
            top:          `calc(${o.y}% - ${o.size / 2}px)`,
            width:        o.size,
            height:       o.size,
            borderRadius: '50%',
            background:   `radial-gradient(circle, ${o.color} 0%, transparent 68%)`,
            animation:    `orbFloat ${o.duration}s ${o.delay}s ease-in-out infinite`,
            pointerEvents:'none',
          }}
        />
      ))}

      {/* ── Main content ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Logo + pulsing rings */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>

          {/* Ring 1 */}
          <div style={{
            position:     'absolute',
            width:         120,
            height:        120,
            borderRadius:  '50%',
            border:        '2px solid rgba(245,158,11,0.55)',
            animation:     'ringPulse 2s 0.2s ease-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Ring 2 */}
          <div style={{
            position:     'absolute',
            width:         120,
            height:        120,
            borderRadius:  '50%',
            border:        '2px solid rgba(249,115,22,0.35)',
            animation:     'ringPulse 2s 0.9s ease-out infinite',
            pointerEvents: 'none',
          }} />

          {/* Logo box */}
          <div style={{
            width:        96,
            height:       96,
            borderRadius: 30,
            background:   'linear-gradient(135deg, #FBBF24, #F59E0B, #EF4444)',
            display:      'flex',
            alignItems:   'center',
            justifyContent:'center',
            boxShadow:    '0 24px 80px rgba(245,158,11,0.45), 0 0 0 1px rgba(255,255,255,0.08) inset',
            animation:    'logoBounce 0.85s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <HardHat size={48} color="#fff" strokeWidth={1.5} />
          </div>
        </div>

        {/* Company name */}
        <div style={{
          fontSize:      30,
          fontWeight:    900,
          color:         '#F8FAFC',
          letterSpacing: '-0.02em',
          marginBottom:  10,
          animation:     'slideUpFade 0.55s 0.45s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          Contractor Pro
        </div>

        {/* Personalised greeting */}
        <div style={{
          fontSize:   18,
          color:      '#CBD5E1',
          fontWeight: 500,
          animation:  'slideUpFade 0.55s 0.72s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {firstName ? `مرحباً بك، ${firstName}!` : 'مرحباً بك!'}
        </div>

        {/* Sub-text */}
        <div style={{
          fontSize:    13,
          color:       '#475569',
          marginTop:   8,
          animation:   'slideUpFade 0.55s 0.95s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          جاري تحميل لوحة التحكم…
        </div>

        {/* Loading dots */}
        <div style={{
          display:   'flex',
          gap:        10,
          marginTop:  52,
          animation: 'slideUpFade 0.55s 1.15s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width:        11,
                height:       11,
                borderRadius: '50%',
                background:   'linear-gradient(135deg, #FBBF24, #F59E0B)',
                boxShadow:    '0 0 8px rgba(245,158,11,0.55)',
                animation:    `dotBounce 1.2s ${i * 0.18}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
