import React, { forwardRef } from 'react'

export const Input = forwardRef(function Input({
  label,
  error,
  hint,
  icon: Icon,
  suffix,
  style = {},
  containerStyle = {},
  ...props
}, ref) {
  const autoId = React.useId()
  const inputId = props.id || autoId
  const msgId = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...containerStyle }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <span style={{ position: 'absolute', right: 12, color: '#64748B', display: 'flex', pointerEvents: 'none' }}>
            <Icon size={16} strokeWidth={1.8} />
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={msgId}
          style={{
            width: '100%',
            background: '#0D0F18',
            border: `1px solid ${error ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.12)'}`,
            borderRadius: 12,
            paddingTop: 10,
            paddingBottom: 10,
            paddingRight: Icon ? 40 : 12,
            paddingLeft: suffix ? 48 : 12,
            color: '#F8FAFC',
            fontSize: 14,
            fontWeight: 500,
            outline: 'none',
            transition: 'border-color .2s, box-shadow .2s',
            ...style,
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(245,158,11,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.08)' }}
          onBlur={e  => { e.target.style.borderColor = error ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.12)'; e.target.style.boxShadow = 'none' }}
          {...props}
        />
        {suffix && (
          <span style={{ position: 'absolute', left: 12, color: '#64748B', fontSize: 13, fontWeight: 600 }}>
            {suffix}
          </span>
        )}
      </div>
      {error && <span id={`${inputId}-err`} role="alert" style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>{error}</span>}
      {hint && !error && <span id={`${inputId}-hint`} style={{ fontSize: 11, color: '#64748B' }}>{hint}</span>}
    </div>
  )
})
