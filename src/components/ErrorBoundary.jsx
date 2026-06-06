import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { C, GRAD } from '../constants/index.js'

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
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 32, textAlign: 'center', color: C.text }}>
        <AlertTriangle size={48} color={C.accent} strokeWidth={1.8} style={{ margin: '0 auto 16px', display: 'block' }} />
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>حدث خطأ غير متوقع</div>
        <div style={{ fontSize: 12, color: C.textDim, marginBottom: 24 }}>
          {this.state.error.message}
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          style={{ padding: '10px 24px', borderRadius: 12, background: GRAD.primary, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          إعادة المحاولة
        </button>
      </div>
    )
  }
}
