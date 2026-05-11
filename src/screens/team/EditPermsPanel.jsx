import React from 'react'
import { Pencil, X, Lock } from 'lucide-react'
import { C, GRAD } from '../../constants/index.js'
import { Btn } from '../../components/index.jsx'
import { PERM_LABELS, PRESET_ROLES } from './teamConstants.js'

export function EditPermsPanel({ member, manager, onSave, projects = [] }) {
  const {
    editingMemberId, closeEditPerms,
    editPerms, editSelectedRole,
    editPermsSaving, editPermsErr,
    handleEditRoleChange, toggleEditPerm,
    editRestrictProjects, setEditRestrictProjects,
    editAllowedProjects, setEditAllowedProjects, toggleEditProject,
  } = manager

  if (!editingMemberId || !member) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: 0 }}
      onClick={e => { if (e.target === e.currentTarget) closeEditPerms() }}
    >
      <div className="slide-up" style={{ width: '100%', maxWidth: 480, background: C.surface, borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', border: `1px solid ${C.borderMid}`, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, display:'flex', alignItems:'center', gap:6 }}><Pencil size={14} strokeWidth={2} /> تعديل الصلاحيات</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>
              {member.display_name || member.username}
            </div>
          </div>
          <button onClick={closeEditPerms} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, color: C.textDim, cursor: 'pointer', padding: '4px 10px', display:'flex', alignItems:'center' }}><X size={14} strokeWidth={2.5} /></button>
        </div>

        {/* Role preset chips */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginBottom: 8, letterSpacing: '0.04em' }}>نموذج الصلاحيات</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_ROLES.map(role => {
              const active = editSelectedRole === role
              return (
                <button key={role} onClick={() => handleEditRoleChange(role)} style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${active ? C.primary : C.border}`,
                  background: active ? `${C.primary}22` : 'transparent',
                  color: active ? C.primary : C.textDim, transition: 'all .15s',
                }}>
                  {role}
                </button>
              )
            })}
          </div>
        </div>

        {/* Permission toggles */}
        <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginBottom: 8, letterSpacing: '0.04em', display:'flex', alignItems:'center', gap:4 }}><Lock size={10} strokeWidth={2} /> الصلاحيات التفصيلية</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 14 }}>
          {PERM_LABELS.map(([key, label]) => {
            const on = !!editPerms[key]
            return (
              <label key={key} style={{
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 11,
                color: on ? C.text : C.textDim, cursor: 'pointer',
                padding: '7px 9px', borderRadius: 9,
                background: on ? `${C.primary}12` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${on ? C.primary + '44' : C.border}`,
                transition: 'all .15s',
              }}>
                <input type="checkbox" checked={on} onChange={() => toggleEditPerm(key)} style={{ accentColor: C.primary, cursor: 'pointer' }} />
                {label}
              </label>
            )
          })}
        </div>

        {/* Project access restriction */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={editRestrictProjects}
              onChange={e => {
                setEditRestrictProjects(e.target.checked)
                if (!e.target.checked) setEditAllowedProjects([])
              }}
              style={{ accentColor: C.primary }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: editRestrictProjects ? C.text : C.textDim }}>
              🗂 تقييد المشاريع (يرى مشاريع محددة فقط)
            </span>
          </label>
          {editRestrictProjects && (
            projects.length === 0
              ? <div style={{ fontSize: 11, color: C.textDim, padding: '6px 10px' }}>لا توجد مشاريع</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {projects.map(proj => {
                    const sel = editAllowedProjects.includes(proj.id)
                    return (
                      <label key={proj.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                        borderRadius: 9, cursor: 'pointer', fontSize: 11,
                        background: sel ? `${C.primary}15` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${sel ? C.primary + '44' : C.border}`,
                        color: sel ? C.text : C.textDim,
                      }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleEditProject(proj.id)} style={{ accentColor: C.primary }} />
                        {proj.name}
                      </label>
                    )
                  })}
                </div>
          )}
        </div>

        {editPermsErr && (
          <div style={{ fontSize: 11, color: C.accent, marginBottom: 10, padding: '8px 12px', background: `${C.accent}12`, borderRadius: 9 }}>
            ⚠ {editPermsErr}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={onSave} full disabled={editPermsSaving}>
            {editPermsSaving ? '⏳ جاري الحفظ...' : '✓ حفظ الصلاحيات'}
          </Btn>
          <Btn onClick={closeEditPerms} variant="outline" color={C.textDim} full>إلغاء</Btn>
        </div>
      </div>
    </div>
  )
}
