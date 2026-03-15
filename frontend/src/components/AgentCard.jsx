import { useState } from 'react'

const AGENT_CONFIG = {
  "Code Summarizer": { color: "var(--agent-1)", icon: "⬡", desc: "Analyzing architecture & structure" },
  "Bug Detector": { color: "var(--agent-2)", icon: "⚠", desc: "Scanning for bugs & issues" },
  "Security Auditor": { color: "var(--agent-3)", icon: "⬢", desc: "Running security audit" },
  "README Generator": { color: "var(--agent-4)", icon: "◈", desc: "Generating documentation" },
}

function renderMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^#{3} (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2} (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupbli]|$)(.+)$/gm, '$1')
}

export default function AgentCard({ agent, status, content, index }) {
  const [collapsed, setCollapsed] = useState(false)
  const config = AGENT_CONFIG[agent] || { color: 'var(--accent)', icon: '◆', desc: '' }

  const statusColors = {
    idle: 'var(--text-muted)',
    running: config.color,
    done: 'var(--success)',
    error: 'var(--error)',
  }

  return (
    <div style={{
      border: `1px solid ${status === 'running' ? config.color + '40' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      background: status === 'running' ? `${config.color}06` : 'var(--bg-2)',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      animation: `fadeUp 0.3s ease ${index * 0.1}s both`,
      boxShadow: status === 'running' ? `0 0 20px ${config.color}15` : 'none',
    }}>
      {/* Header */}
      <div
        onClick={() => status !== 'idle' && setCollapsed(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          cursor: status !== 'idle' ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36, height: 36,
          borderRadius: '8px',
          background: `${config.color}15`,
          border: `1px solid ${config.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px',
          color: config.color,
          flexShrink: 0,
        }}>
          {status === 'running' ? (
            <div style={{
              width: 14, height: 14,
              border: `2px solid ${config.color}40`,
              borderTop: `2px solid ${config.color}`,
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
          ) : config.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: status === 'idle' ? 'var(--text-muted)' : 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
          }}>
            {agent}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {status === 'idle' && 'Waiting...'}
            {status === 'running' && (
              <span style={{ color: config.color }}>{config.desc}</span>
            )}
            {status === 'done' && <span style={{ color: 'var(--success)' }}>✓ Complete</span>}
            {status === 'error' && <span style={{ color: 'var(--error)' }}>✗ Error</span>}
          </div>
        </div>

        {/* Toggle */}
        {status !== 'idle' && content && (
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            {collapsed ? '▼' : '▲'}
          </div>
        )}
      </div>

      {/* Content */}
      {!collapsed && content && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '16px',
          maxHeight: status === 'running' ? '300px' : '500px',
          overflowY: 'auto',
          fontSize: '13px',
          lineHeight: 1.7,
          color: 'var(--text-secondary)',
        }}>
          <div
            className="md"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(content) + (status === 'running'
                ? '<span style="animation: blink 1s infinite; display:inline-block; color: var(--accent)">▋</span>'
                : '')
            }}
          />
        </div>
      )}
    </div>
  )
}
