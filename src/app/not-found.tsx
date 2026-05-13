export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          fontFamily: 'DM Serif Display, Georgia, serif',
          fontSize: 96,
          color: 'rgba(255,255,255,0.08)',
          lineHeight: 1,
          marginBottom: 24,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: 'DM Serif Display, Georgia, serif',
          fontSize: 36,
          color: '#f5f5f0',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}
      >
        Page not found.
      </h1>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', marginBottom: 32 }}>
        This page doesn&apos;t exist — but your startup idea might.
      </p>
      <a
        href="/"
        style={{
          background: '#3dffc0',
          color: '#0a0a0b',
          fontWeight: 700,
          padding: '12px 28px',
          borderRadius: 6,
          fontSize: 15,
          textDecoration: 'none',
        }}
      >
        Back to IdeaMash →
      </a>
    </div>
  );
}
