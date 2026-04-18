import React, { useState } from 'react'
import { C } from '../constants/index.js'
import { Btn, Card, ConfirmDialog } from '../components/index.jsx'
import { useAuth } from '../hooks/useAuth.js'

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

export default function SettingsScreen({ projects, employees, workDays, expenses, payments, userId, specs, expCats, addSpec, removeSpec, addExpCat, removeExpCat, profile, profSaving, uploading, saveName, uploadAvatar, permissions, teamMembers, inviteMember, updateMember, removeMember }) {
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

      {/* هيدر الحساب - الصورة + الاسم + الإيميل */}
      <Card>
        <div style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
            {/* الصورة */}
            <label style={{ cursor:'pointer', flexShrink:0, position:'relative' }}>
              <input type="file" accept="image/*" style={{ display:'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadError('')
                  try { await uploadAvatar(file) }
                  catch (err) { setUploadError('فشل رفع الصورة، تأكد من إعداد Supabase Storage') }
                }}
              />
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width:60, height:60, borderRadius:'50%', objectFit:'cover', border:`2px solid ${C.primary}` }} />
                : <div style={{ width:60, height:60, borderRadius:'50%', background:`${C.primary}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, border:`2px dashed ${C.primary}44` }}>👤</div>
              }
              <div style={{ position:'absolute', bottom:0, right:0, width:18, height:18, borderRadius:'50%', background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>
                {uploading ? '⏳' : '📷'}
              </div>
            </label>

            {/* الاسم والإيميل */}
            <div style={{ flex:1, minWidth:0 }}>
              {editingName
                ? <div style={{ display:'flex', gap:6 }}>
                    <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { saveName(nameInput); setEditingName(false) } if (e.key === 'Escape') setEditingName(false) }}
                      style={{ flex:1, padding:'6px 10px', borderRadius:8, border:`1.5px solid ${C.primary}`, background:C.bg, color:C.text, fontSize:14, fontWeight:700, outline:'none' }}
                    />
                    <button onClick={() => { saveName(nameInput); setEditingName(false) }}
                      style={{ padding:'6px 10px', borderRadius:8, background:C.primary, color:C.bg, border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                      {profSaving ? '...' : '✓'}
                    </button>
                  </div>
                : <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{profile?.full_name || 'أضف اسمك'}</div>
                    <button onClick={() => { setNameInput(profile?.full_name || ''); setEditingName(true) }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:C.textDim }}>✏️</button>
                  </div>
              }
              <div style={{ fontSize:11, color:C.textDim, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            </div>

            {/* زر الخروج */}
            <button onClick={() => setConfirmSignOut(true)}
              style={{ padding:'8px 10px', borderRadius:12, border:`1.5px solid ${C.accent}33`, background:`${C.accent}11`, color:C.accent, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
              🚪 خروج
            </button>
          </div>
          {uploadError && <div style={{ fontSize:11, color:C.accent }}>{uploadError}</div>}
        </div>
      </Card>

      {/* البصمة */}
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
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {(specs || []).map(s => (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:14, background:`${C.blue}22`, border:`1px solid ${C.blue}33` }}>
                <span style={{ color:C.blue, fontSize:11 }}>{s}</span>
                <button onClick={() => removeSpec(s)} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:12, padding:0, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={newSpec}
              onChange={e => setNewSpec(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newSpec.trim()) { addSpec(newSpec); setNewSpec('') } }}
              placeholder="تخصص جديد..."
              style={{ flex:1, padding:'8px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontSize:12, outline:'none' }}
            />
            <button onClick={() => { if (newSpec.trim()) { addSpec(newSpec); setNewSpec('') } }}
              style={{ padding:'8px 14px', borderRadius:10, background:C.primary, color:C.bg, border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>+</button>
          </div>
        </div>
      </Card>

      {/* تصنيفات المصاريف */}
      <Card>
        <div style={{ padding:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:12 }}>📂 تصنيفات المصاريف</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
            {(expCats || []).map(c => (
              <div key={c} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:14, background:`${C.orange}22`, border:`1px solid ${C.orange}33` }}>
                <span style={{ color:C.orange, fontSize:11 }}>{c}</span>
                <button onClick={() => removeExpCat(c)} style={{ background:'none', border:'none', color:C.accent, cursor:'pointer', fontSize:12, padding:0, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={newExpCat}
              onChange={e => setNewExpCat(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newExpCat.trim()) { addExpCat(newExpCat); setNewExpCat('') } }}
              placeholder="تصنيف جديد..."
              style={{ flex:1, padding:'8px 12px', borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontSize:12, outline:'none' }}
            />
            <button onClick={() => { if (newExpCat.trim()) { addExpCat(newExpCat); setNewExpCat('') } }}
              style={{ padding:'8px 14px', borderRadius:10, background:C.orange, color:C.bg, border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>+</button>
          </div>
        </div>
      </Card>

      {/* إدارة الفريق - للمالك فقط */}
      {permissions?.manageTeam && (
        <Card>
          <div style={{ padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.text }}>👥 الفريق</div>
              <button onClick={() => { setShowInvite(!showInvite); setInviteError('') }}
                style={{ padding:'6px 12px', borderRadius:10, background:`${C.primary}22`, color:C.primary, border:`1px solid ${C.primary}44`, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                + دعوة
              </button>
            </div>

            {/* فورم الدعوة */}
            {showInvite && (
              <div style={{ background:`${C.border}22`, borderRadius:12, padding:12, marginBottom:12 }}>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="إيميل الشخص المدعو"
                  style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontSize:12, marginBottom:10, boxSizing:'border-box', outline:'none' }}
                />
                <div style={{ fontSize:11, color:C.textDim, marginBottom:8, fontWeight:700 }}>الصلاحيات:</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:10 }}>
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

            {/* قائمة الأعضاء */}
            {teamMembers.length === 0
              ? <div style={{ fontSize:12, color:C.textDim, textAlign:'center', padding:'8px 0' }}>لا يوجد أعضاء بعد</div>
              : teamMembers.map(m => (
                <div key={m.id} style={{ marginBottom:8, background:`${C.border}22`, borderRadius:12, padding:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text }}>{m.email}</div>
                      <div style={{ fontSize:10, color: m.status==='active' ? C.success : C.warning }}>
                        {m.status === 'active' ? '● نشط' : '⏳ في انتظار القبول'}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => { setEditingMember(m.id); setEditPerms(Object.fromEntries(PERM_LABELS.map(([k]) => [k, m[k]]))) }}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:14 }}>✏️</button>
                      <button onClick={() => removeMember(m.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:14 }}>🗑️</button>
                    </div>
                  </div>
                  {/* تعديل صلاحيات العضو */}
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
        </Card>
      )}

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
