export default function IdeaCardSkeleton({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const isDark = variant === 'dark';
  const bg = isDark ? '#111114' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 3, borderRadius: 2 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ width: '80%', height: 24, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '60%', height: 14, borderRadius: 4 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ width: 60, height: 32, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 60, height: 32, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 60, height: 32, borderRadius: 6 }} />
      </div>
    </div>
  );
}
