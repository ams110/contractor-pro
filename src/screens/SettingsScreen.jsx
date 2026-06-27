import React, { useState } from 'react'
import { C, SPECS, EXP_CATS } from '../constants/index.js'
import { Btn, Card, ConfirmDialog } from '../components/index.jsx'
import { useAuth } from '../hooks/useAuth.js'

export default function SettingsScreen({ projects, employees, workDays, expenses, payments, userId }) {
  const { signOut, registerPasskey, isPasskeySupported, user } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [passkeyStatus,  setPasskeyStatus]  = useState('')
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  async function handleRegisterPasskey() {
    setPasskeyLoading(true)
    setPasskeyStatus('')
    try {
      await registerPasskey()
      setPasskeyStatus('✓ تم تفعيل البصمة بنجاح!')
    } catch (e) {
      setPasskeyStatus(`⚠ ${e.message}`)
    } finally {
      setPasskeyLoading(false)
    }
  }

  function exportData() {
    const payload = { projects, employees, workDays, expenses, payments, exportedAt: new Date().toISOString() }
    const blob    = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href        = url
    a.download    = `contractor-pro-backup-${new Date().toLocaleDateString('en-CA')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fade-in" style={{ padding:16 }}>
      <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:16 }}>⚙️ الإعدادات</div>

      {/* معلومات الحساب */}
      <Card>
        <div style={{ padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:12 }}>👤 الحساب</div>
          <div style={{ fontSize:13, color:C.textDim, marginBottom:16 }}>{user?.email}</div>

          {isPasskeySupported() && (
            <div style={{ marginBottom:12 }}>
              <Btn onClick={handleRegisterPasskey} disabled={passkeyLoading} variant="outline" color={C.primary} full>
                {passkeyLoading ? '...' : '👆 تفعيل الدخول بالبصمة'}
              </Btn>
              {passkeyStatus && (
                <div style={{ fontSize:12, marginTop:8, color: passkeyStatus.startsWith('✓') ? C.success : C.accent, textAlign:'center' }}>
                  {passkeyStatus}
                </div>
              )}
            </div>
          )}

          <Btn onClick={() => setConfirmSignOut(true)} variant="outline" color={C.accent} full>
            🚪 تسجيل خروج
          </Btn>
        </div>
      </Card>

      {/* الإحصائيات */}
      <Card>
        <div style={{ padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:12 }}>📊 إحصائيات</div>
          {[
            ['مشاريع',    projects.length],
            ['عمال',      employees.length],
            ['أيام عمل',  workDays.length],
            ['مصاريف',    expenses.length],
            ['دفعات',     payments.length],
          ].map(([k, v], i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom: i < 4 ? `1px solid ${C.border}22` : 'none' }}>
              <span style={{ fontSize:12, color:C.textDim }}>{k}</span>
              <span style={{ fontSize:14, color:C.primary, fontWeight:700 }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* التخصصات */}
      <Card>
        <div style={{ padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:12 }}>🔧 التخصصات</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {SPECS.map(s => (
              <span key={s} style={{ padding:'5px 11px', borderRadius:14, background:`${C.blue}22`, border:`1px solid ${C.blue}33`, color:C.blue, fontSize:11 }}>{s}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* تصنيفات المصاريف */}
      <Card>
        <div style={{ padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:12 }}>📂 تصنيفات المصاريف</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {EXP_CATS.map(c => (
              <span key={c} style={{ padding:'5px 11px', borderRadius:14, background:`${C.orange}22`, border:`1px solid ${C.orange}33`, color:C.orange, fontSize:11 }}>{c}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* تصدير البيانات */}
      <div style={{ marginTop:8 }}>
        <Btn onClick={exportData} variant="outline" color={C.blue} full>📥 تصدير نسخة احتياطية (JSON)</Btn>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={signOut}
        message="متأكد بدك تسجّل خروج؟"
      />
    </div>
  )
}
