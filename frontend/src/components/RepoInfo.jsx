export default function RepoInfo({ info }) {
  if (!info) return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '14px 18px',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      animation: 'fadeUp 0.3s ease',
    }}>
      <div style={{ fontSize: '24px' }}>⬡</div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--accent)',
        }}>
          {info.owner}/{info.repo}
        </div>
        {info.description && (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {info.description}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
        {info.language && (
          <Tag label={info.language} color="var(--accent-2)" />
        )}
        <Tag label={`${info.file_count} files`} color="var(--text-muted)" />
        {info.stars > 0 && (
          <Tag label={`★ ${info.stars}`} color="var(--warning)" />
        )}
      </div>
    </div>
  )
}

function Tag({ label, color }) {
  return (
    <div style={{
      fontSize: '11px',
      fontFamily: 'var(--font-mono)',
      color,
      background: `${color}15`,
      border: `1px solid ${color}25`,
      padding: '3px 8px',
      borderRadius: '4px',
    }}>
      {label}
    </div>
  )
}
