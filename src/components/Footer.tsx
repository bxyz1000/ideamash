export default function Footer() {
  return (
    <footer
      style={{
        background: '#0a0a0b',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '48px 24px 32px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 24,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'DM Serif Display, serif',
                fontSize: 24,
                color: '#f5f5f0',
                marginBottom: 8,
                letterSpacing: '-0.02em',
              }}
            >
              idea<span style={{ color: '#3dffc0' }}>//</span>mash
            </div>
            <p
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 280, lineHeight: 1.5 }}
            >
              India&apos;s startup idea validation platform. No AI hype. Just real humans voting.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.3)',
                  marginBottom: 2,
                }}
              >
                Platform
              </span>
              <a href="/" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                Home
              </a>
              <a href="/post" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                Post Idea
              </a>
              <a href="/login" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                Login
              </a>
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            © 2025 IdeaMash. Built for Indian founders.
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            🔥 crazy shit or 🗑 dump it
          </p>
        </div>
      </div>
    </footer>
  );
}
