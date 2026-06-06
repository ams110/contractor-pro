import React from 'react'
import { C } from '../constants/index.js'
import { Skeleton, SkeletonCard } from '../ui/Skeleton.jsx'

/*
 * ScreenSkeleton — هياكل تحميل تحاكي تخطيط كل شاشة (بدل النص/الـ spinner).
 * variant: 'dashboard' | 'list' | 'finance'
 * تُعرض فقط عند التحميل الأول (قبل وصول أي بيانات) لمنع وميض الـ refetch.
 */

// لوحة بترويسة (أيقونة + سطرين) + جسم
function Panel({ h }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Skeleton w={34} h={34} radius={11} />
        <div style={{ flex: 1 }}>
          <Skeleton w="45%" h={13} style={{ marginBottom: 7 }} />
          <Skeleton w="28%" h={9} />
        </div>
      </div>
      <Skeleton w="100%" h={h} radius={12} />
    </div>
  )
}

// صف عنصر قائمة (أيقونة/أفاتار + سطرين + قيمة خلفية)
function Row({ circle = false }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <Skeleton w={46} h={46} radius={circle ? 999 : 13} circle={circle} />
      <div style={{ flex: 1 }}>
        <Skeleton w="55%" h={13} style={{ marginBottom: 8 }} />
        <Skeleton w="35%" h={10} />
      </div>
      <Skeleton w={54} h={22} radius={8} />
    </div>
  )
}

function Header() {
  return (
    <div style={{ marginBottom: 2 }}>
      <Skeleton w={150} h={24} radius={8} style={{ marginBottom: 9 }} />
      <Skeleton w={210} h={12} />
    </div>
  )
}

function DashboardVariant() {
  return (
    <>
      <Header />
      <Panel h={88} />
      <Panel h={120} />
      <Panel h={120} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SkeletonCard /><SkeletonCard />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <Panel h={150} />
    </>
  )
}

function ListVariant({ circle }) {
  return (
    <>
      <Header />
      {/* شريط بحث + فلاتر */}
      <Skeleton w="100%" h={44} radius={14} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton w={70} h={30} radius={999} />
        <Skeleton w={86} h={30} radius={999} />
        <Skeleton w={64} h={30} radius={999} />
      </div>
      {Array.from({ length: 6 }).map((_, i) => <Row key={i} circle={circle} />)}
    </>
  )
}

function FinanceVariant() {
  return (
    <>
      {/* مبدّل المصالح */}
      <Skeleton w="100%" h={52} radius={16} />
      {/* شريط التبويبات */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[64, 74, 70, 60, 66, 80].map((w, i) => <Skeleton key={i} w={w} h={32} radius={999} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SkeletonCard /><SkeletonCard />
      </div>
      <Panel h={120} />
      {Array.from({ length: 4 }).map((_, i) => <Row key={i} />)}
    </>
  )
}

export default function ScreenSkeleton({ variant = 'list' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, direction: 'rtl' }}>
      {variant === 'dashboard' && <DashboardVariant />}
      {variant === 'finance'   && <FinanceVariant />}
      {variant === 'workers'   && <ListVariant circle />}
      {variant === 'list'      && <ListVariant />}
    </div>
  )
}
