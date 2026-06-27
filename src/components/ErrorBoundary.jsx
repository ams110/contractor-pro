import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'
import { Sentry } from '../lib/sentry.js'
import { tl } from '../lib/labels.js'
import { useAppStore } from '../store/useAppStore.js'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
    Sentry.captureException(error, { extra: { componentStack: info?.componentStack, screen: this.props.screen } })
  }

  render() {
    if (!this.state.error) return this.props.children
    const language = useAppStore.getState().language
    return (
      <div style={{ padding: 32, textAlign: 'center', color: C.text }}>
        <AlertTriangle size={48} color={C.accent} strokeWidth={1.8} style={{ margin: '0 auto 16px', display: 'block' }} />
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{tl(language, 'حدث خطأ غير متوقع', 'אירעה שגיאה לא צפויה', 'An unexpected error occurred')}</div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 24 }}>
          {this.state.error.message}
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{ padding: '10px 24px', borderRadius: 12, background: GRAD.primary, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {tl(language, 'إعادة المحاولة', 'נסה שוב', 'Try again')}
        </button>
      </div>
    )
  }
}
