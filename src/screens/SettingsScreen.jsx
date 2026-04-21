import React, { useState } from 'react'
import { C, GRAD } from '../constants/index.js'
import { Btn, GlassCard, SectionLabel, ConfirmDialog } from '../components/index.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { exportFullReportToExcel, exportTaxSummary } from '../lib/export.js'

const PERM_LABELS = [
  ['can_view_projects',  'مشاهدة المشاريع'],
  ['can_edit_projects',  'إضافة/تعديل المشاريع'],
  ['can_view_workers',   'مشاهدة العمال'],
  ['can_edit_workers',   'إضافة/تعديل العمال'],
  ['can_view_expenses',  'مشاهدة المصاريف'],
  ['can_add_expenses',   'إضافة المصاريف'],
  ['can_view_payments',  'مشاهدة الرواتب'],
  ['can_add_payments',   'إضافة الرواتب'],
  ['can_delete',         'حذف السجلات'],
  ['can_manage_team',    'إدارة الفريق'],
]

const DEFAULT_NEW_PERMS = Object.fromEntries(PERM_LABELS.map(([k]) => [k, false]))

export default function SettingsScreen({ projects, employees, workDays, expenses, payments, clientReceipts, userId, specs, expCats, addSpec, removeSpec, addExpCat, removeExpCat, pensionMonthly, setPensionMonthly, profile, profSaving, uploading, saveName, uploadAvatar, permissions, teamMembers, inviteMember, updateMember, removeMember }) {
  const { signOut, registerPasskey, isPasskeySupported, user } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [passkeyStatus,  setPasskeyStatus]  = useState('')
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [newSpec,        setNewSpec]        = useState('')
  const [newExpCat,      setNewExpCat]      = useState('')
  const [editingName,    setEditingName]    = useState(false)
  const [nameInput,      setNameInput]      = useState('')
  const [uploadError,    setUploadError]    = useState('')
  const [showInvite,     setShowInvite]     = useState(false)
  const [inviteEmail,    setInviteEmail]    = useState('')
  const [invitePerms,    setInvitePerms]    = useState(DEFAULT_NEW_PERMS)
  const [inviting,       setInviting]       = useState(false)
  const [inviteError,    setInviteError]    = useState('')
  const [editingMember,  setEditingMember]  = useState(null)
  const [editPerms,      setEditPerms]      = useState({})

  async function handleRegisterPasskey() {
    setPasskeyLoading(true); setPasskeyStatus('')
    try { await registerPasskey(); setPasskeyStatus('✓ تم تفعيل البصمة بنجاح!') }
    catch (e) { setPasskeyStatus(`⚠ ${e.message}`) }
    finally   { setPasskeyLoading(false) }
  }

  function exportData() {
    const payload = { projects, employees, workDays, expenses, payments, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `contractor-pro-backup-${new Date().toLocaleDateString('en-CA')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stats = [
    { l:'مشاريع', v: projects.length,  c: C.primary  },
    { l:'عمال',   v: employees.length, c: C.secondary },
    { l:'أيام',   v: workDays.length,  c: C.success   },
    { l:'مصاريف', v: expenses.length,  c: C.warning   },
    { l:'دفعات',  v: payments.length,  c: C.accent    },
  ]

  return (
    <div className="fade-up" style={{ padding:16, paddingBottom:100 }}>

      {/* ── بطاقة الحساب ── */}
      <GlassCard style={{ overflow:'hidden', marginBottom:16 }}>
        <div style={{ height:3, background:GRAD.brand }} />
        <div style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:4 }}>
            {/* صورة بـ gradient border */}
            <label style={{ cursor:'pointer', flexShrink:0, position:'relative' }}>
              <input type="file" accept="image/*" style={{ display:'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadError('')
                  try { await uploadAvatar(file) }
                  catch { setUploadError('فشل رفع الصورة') }
                }}
              />
              <div style={{ padding:3, borderRadius:'50%', background:GRAD.brand, display:'inline-block' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar"
                      style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', display:'block', border:`2px solid ${C.bg}` }} />
                  : <div style={{ width:64, height:64, borderRadius:'50%', background:C.surface, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, border:`2px solid ${C.bg}` }}>
                      {profile?.full_name ? profile.full_name.charAt(0) : '👤'}
                    </div>
                }
              </div>
              <div style={{ position:'absolute', bottom:2, right:2, width:20, height:20, borderRadius:'50%', background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, border:`2px solid ${C.bg}` }}>
                {uploading ? '⏳' : '📷'}
              </div>
            </label>

            {/* الاسم والإيميل */}
            <div style={{ flex:1, minWidth:0 }}>
              {editingName
                ? <div style={{ display:'flex', gap:6 }}>
                    <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  { saveName(nameInput); setEditingName(false) }
                        if (e.key === 'Escape') { setEditingName(false) }
                      }}
                      style={{ flex:1, padding:'8px 12px', borderRadius:10, border:`1.5px solid ${C.primary}`, background:C.surface, color:C.text, fontSize:15, fontWeight:700, outline:'none' }}
                    />
                    <button onClick={() => { saveName(nameInput); setEditingName(false) }}
                      style={{ padding:'8px 12px', borderRadius:10, background:GRAD.brand, color:'#000', border:'none', cursor:'pointer', fontSize:13, fontWeight:800 }}>
                      {profSaving ? '...' : '✓'}
                    </button>
                  </div>
                : <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ fontSize:18, fontWeight:900, color:C.text }}>{profile?.full_name || 'أضف اسمك'}</div>
                    <button onClick={() => { setNameInput(profile?.full_name || ''); setEditingName(true) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:C.textDim }}>✏️</button>
                  </div>
              }
              <div style={{ fontSize:11, color:C.textDim, marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            </div>

            {/* خروج */}
            <button onClick={() => setConfirmSignOut(true)}
              style={{ padding:'8px 12px', borderRadius:12, border:`1.5px solid ${C.accent}44`, background:`${C.accent}15`, color:C.accent, fontSize:11, fontWeight:700, cursor:'pointer' }}>
              🚪
            </button>
          </div>
          {uploadError && <div style={{ fontSize:11, color:C.accent, marginTop:8 }}>{uploadError}</div>}
        </div>
      </GlassCard>

      {/* ── إحصائيات ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:16 }}>
        {stats.map(s => (
          <div key={s.l} style={{ textAlign:'center', padding:'12px 4px', background:'rgba(255,255,255,0.04)', backdropFilter:'blur(12px)', borderRadius:14, border:`1px solid ${s.c}33` }}>
            <div style={{ fontSize:20, fontWeight:900, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
            <div style={{ fontSize:9, color:C.textDim, marginTop:2, fontWeight:600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── البصمة ── */}
      {isPasskeySupported() && (
        <div style={{ marginBottom:16 }}>
          <Btn onClick={handleRegisterPasskey} disabled={passkeyLoading} variant="outline" full>
            {passkeyLoading ? '...' : '👆 تفعيل الدخول بالبصمة / Face ID'}
          </Btn>
          {passkeyStatus && (
            <div style={{ fontSize:12, marginTop:8, color: passkeyStatus.startsWith('✓') ? C.success : C.accent, textAlign:'center', fontWeight:600 }}>
              {passkeyStatus}
            </div>
          )}
        </div>
      )}

      {/* ── التخصصات ── */}
      <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
        <div style={{ height:3, background:GRAD.blue }} />
        <div style={{ padding:'14px 16px' }}>
          <SectionLabel color={C.blue}>🔧 التخصصات</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {(specs || []).map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:20, background:`${C.blue}18`, border:`1px solid ${C.blue}33` }}>
                <span style={{ color:C.blue, fontSize:11, fontWeight:600 }}>{s}</span>
                <button onClick={() => removeSpec(s)} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:13, padding:0, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newSpec} onChange={e => setNewSpec(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newSpec.trim()) { addSpec(newSpec); setNewSpec('') } }}
              placeholder="تخصص جديد..."
              style={{ flex:1, padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, outline:'none' }}
            />
            <button onClick={() => { if (newSpec.trim()) { addSpec(newSpec); setNewSpec('') } }}
              style={{ padding:'9px 14px', borderRadius:10, background:GRAD.blue, color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:800 }}>+</button>
          </div>
        </div>
      </GlassCard>

      {/* ── تصنيفات المصاريف ── */}
      <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
        <div style={{ height:3, background:GRAD.warm }} />
        <div style={{ padding:'14px 16px' }}>
          <SectionLabel color={C.orange}>📂 تصنيفات المصاريف</SectionLabel>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {(expCats || []).map(c => (
              <div key={c} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', borderRadius:20, background:`${C.orange}18`, border:`1px solid ${C.orange}33` }}>
                <span style={{ color:C.orange, fontSize:11, fontWeight:600 }}>{c}</span>
                <button onClick={() => removeExpCat(c)} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:13, padding:0, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newExpCat} onChange={e => setNewExpCat(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newExpCat.trim()) { addExpCat(newExpCat); setNewExpCat('') } }}
              placeholder="تصنيف جديد..."
              style={{ flex:1, padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:12, outline:'none' }}
            />
            <button onClick={() => { if (newExpCat.trim()) { addExpCat(newExpCat); setNewExpCat('') } }}
              style={{ padding:'9px 14px', borderRadius:10, background:GRAD.warm, color:'#000', border:'none', cursor:'pointer', fontSize:14, fontWeight:800 }}>+</button>
          </div>
        </div>
      </GlassCard>

      {/* ── پنسيه ── */}
      <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
        <div style={{ height:3, background:GRAD.purple }} />
        <div style={{ padding:'14px 16px' }}>
          <SectionLabel color={C.purple}>🏦 פנסיה — القسط الشهري</SectionLabel>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="number" min="0" value={pensionMonthly || ''}
              onChange={e => setPensionMonthly && setPensionMonthly(e.target.value)}
              placeholder="0"
              style={{ flex:1, padding:'10px 14px', borderRadius:12, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.05)', color:C.text, fontSize:17, fontWeight:700, fontFamily:'monospace', outline:'none' }}
            />
            <span style={{ fontSize:13, color:C.textDim }}>₪/شهر</span>
          </div>
          <div style={{ fontSize:10, color:C.textDim, marginTop:8 }}>يُستخدم لحساب الخصم الضريبي في لوحة الضرائب</div>
        </div>
      </GlassCard>

      {/* ── إدارة الفريق ── */}
      {permissions?.manageTeam && (
        <GlassCard style={{ marginBottom:16, overflow:'hidden' }}>
          <div style={{ height:3, background:GRAD.success }} />
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <SectionLabel color={C.success}>👥 الفريق</SectionLabel>
              <button onClick={() => { setShowInvite(!showInvite); setInviteError('') }}
                style={{ padding:'6px 14px', borderRadius:10, background:`${C.success}20`, color:C.success, border:`1px solid ${C.success}44`, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                + دعوة
              </button>
            </div>

            {showInvite && (
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:14, padding:14, marginBottom:14, border:`1px solid ${C.border}` }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="إيميل الشخص المدعو"
                  style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:'rgba(255,255,255,0.04)', color:C.text, fontSize:12, marginBottom:12, boxSizing:'border-box', outline:'none' }}
                />
                <div style={{ fontSize:11, color:C.textDim, marginBottom:8, fontWeight:700 }}>الصلاحيات:</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
                  {PERM_LABELS.map(([key, label]) => (
                    <label key={key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.text, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!invitePerms[key]} onChange={e => setInvitePerms(p => ({ ...p, [key]: e.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>
                {inviteError && <div style={{ fontSize:11, color:C.accent, marginBottom:8 }}>{inviteError}</div>}
                <Btn onClick={async () => {
                  if (!inviteEmail.trim() || !inviteEmail.includes('@')) return setInviteError('أدخل إيميل صحيح')
                  setInviting(true)
                  try { await inviteMember(inviteEmail.trim(), invitePerms); setShowInvite(false); setInviteEmail(''); setInvitePerms(DEFAULT_NEW_PERMS) }
                  catch (e) { setInviteError(e.message) }
                  finally { setInviting(false) }
                }} full disabled={inviting}>{inviting ? '...' : 'إرسال الدعوة'}</Btn>
              </div>
            )}

            {teamMembers.length === 0
              ? <div style={{ fontSize:12, color:C.textDim, textAlign:'center', padding:'8px 0' }}>لا يوجد أعضاء بعد</div>
              : teamMembers.map(m => (
                <div key={m.id} style={{ marginBottom:8, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{m.email}</div>
                      <div style={{ fontSize:10, color: m.status==='active' ? C.success : C.warning, marginTop:2 }}>
                        {m.status === 'active' ? '● نشط' : '⏳ في انتظار القبول'}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => { setEditingMember(m.id); setEditPerms(Object.fromEntries(PERM_LABELS.map(([k]) => [k, m[k]]))) }}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:16 }}>✏️</button>
                      <button onClick={() => removeMember(m.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:16 }}>🗑️</button>
                    </div>
                  </div>
                  {editingMember === m.id && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:8 }}>
                        {PERM_LABELS.map(([key, label]) => (
                          <label key={key} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.text, cursor:'pointer' }}>
                            <input type="checkbox" checked={!!editPerms[key]} onChange={e => setEditPerms(p => ({ ...p, [key]: e.target.checked }))} />
                            {label}
                          </label>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <Btn onClick={async () => { await updateMember(m.id, editPerms); setEditingMember(null) }} full>حفظ</Btn>
                        <Btn onClick={() => setEditingMember(null)} variant="outline" color={C.textDim} full>إلغاء</Btn>
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </GlassCard>
      )}

      {/* ── التصدير ── */}
      <SectionLabel color={C.primary}>📤 تصدير البيانات</SectionLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
        <button onClick={() => exportFullReportToExcel({ projects, employees, workDays, expenses, payments, clientReceipts: clientReceipts || [] })}
          style={{ padding:'13px 16px', borderRadius:14, border:'none', background:GRAD.success, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:`0 4px 16px ${C.success}44` }}>
          📊 تصدير تقرير Excel كامل
        </button>
        <button onClick={() => exportTaxSummary({ year: new Date().getFullYear(), clientReceipts: clientReceipts || [], expenses, projects })}
          style={{ padding:'13px 16px', borderRadius:14, border:'none', background:GRAD.purple, color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:`0 4px 16px ${C.purple}44` }}>
          🇮🇱 تصدير ملخص ضريبي للمحاسب
        </button>
        <button onClick={exportData}
          style={{ padding:'13px 16px', borderRadius:14, border:`1.5px solid ${C.blue}44`, background:`${C.blue}15`, color:C.blue, fontSize:13, fontWeight:800, cursor:'pointer' }}>
          📥 نسخة احتياطية (JSON)
        </button>
      </div>

      <ConfirmDialog open={confirmSignOut} onClose={() => setConfirmSignOut(false)} onConfirm={signOut} message="متأكد بدك تسجّل خروج؟" />
    </div>
  )
}
