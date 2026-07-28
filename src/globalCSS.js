// ─── الأنميشن/الكلاسات العامة المشتركة ─────────────────────────────────────────
// مصدر واحد يستعمله تطبيق المالك (`App.jsx`) وتطبيق بوّابة العامل
// (`worker-main.jsx`) — التطبيقان وثيقتان منفصلتان، فلازم يشاركا نفس السلسلة
// بدل نسختين تتعتّق إحداهما.

export const globalCSS = `
  @keyframes spin       { to { transform:rotate(360deg) } }
  @keyframes float      { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-7px) } }
  @keyframes shimmer    { 0% { background-position:200% 0 } to { background-position:-200% 0 } }
  @keyframes ping       { 75%,100% { transform:scale(2.2); opacity:0 } }
  @keyframes glowPulse  { 0%,100% { box-shadow:0 0 14px rgba(249,115,22,0.3) } 50% { box-shadow:0 0 28px rgba(249,115,22,0.55) } }
  @keyframes badgePop   { 0% { transform:scale(0) } 70% { transform:scale(1.2) } 100% { transform:scale(1) } }
  @keyframes auroraMove { 0%,100% { opacity:0.6 } 50% { opacity:1 } }

  .glass { background:rgba(7,8,15,0.88); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); border:1px solid rgba(249,115,22,0.07); }
  .badge-pop { animation: badgePop .3s cubic-bezier(0.34,1.56,0.64,1) both; }
  .app-root { min-height: var(--actual-vh, 100dvh); }
`

export default globalCSS
