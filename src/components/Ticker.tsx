'use client';

export default function Ticker() {
  const items = [
    '🔥 crazy shit',
    '🗑 dump it',
    '💬 real feedback',
    '⚡ brutal validation',
    '🚀 raw ideas',
    '🌍 made by founders',
    '💀 no fake hype',
    '🔥 crazy shit',
    '🗑 dump it',
    '💬 real feedback',
    '⚡ brutal validation',
    '🚀 raw ideas',
    '🌍 made by founders',
    '💀 no fake hype',
  ];

  return (
    <div
      style={{
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        padding: '14px 0',
      }}
    >
      <div className="ticker-track">
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0,
              paddingRight: 48,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            {item}
            <span style={{ marginLeft: 48, color: 'rgba(255,255,255,0.2)' }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
