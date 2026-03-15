import { useState, useRef, useCallback } from 'react'
import AgentCard from './components/AgentCard'
import RepoInfo from './components/RepoInfo'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

const AGENTS = ["Code Summarizer", "Bug Detector", "Security Auditor", "README Generator"]

const EXAMPLES = [
  "https://github.com/tiangolo/fastapi",
  "https://github.com/facebook/react",
  "https://github.com/vitejs/vite",
]

const initialAgentState = () =>
  Object.fromEntries(AGENTS.map(a => [a, { status: 'idle', content: '' }]))

export default function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [agents, setAgents] = useState(initialAgentState())
  const [repoInfo, setRepoInfo] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const wsRef = useRef(null)

  const reset = () => {
    setAgents(initialAgentState())
    setRepoInfo(null)
    setStatusMsg('')
    setError('')
    setDone(false)
  }

  const analyze = useCallback(() => {
    if (!repoUrl.trim() || running) return
    reset()
    setRunning(true)

    const ws = new WebSocket(`${WS_URL}/api/analyze`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ repo_url: repoUrl.trim() }))
    }

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data)

      if (event.type === 'status') {
        setStatusMsg(event.message)
      } else if (event.type === 'repo_info') {
        setRepoInfo(event.data)
        setStatusMsg('')
      } else if (event.type === 'agent_start') {
        setAgents(prev => ({
          ...prev,
          [event.agent]: { status: 'running', content: '' }
        }))
      } else if (event.type === 'token') {
        setAgents(prev => ({
          ...prev,
          [event.agent]: {
            ...prev[event.agent],
            content: (prev[event.agent]?.content || '') + event.content,
          }
        }))
      } else if (event.type === 'agent_done') {
        setAgents(prev => ({
          ...prev,
          [event.agent]: { ...prev[event.agent], status: 'done' }
        }))
      } else if (event.type === 'agent_error') {
        setAgents(prev => ({
          ...prev,
          [event.agent]: { ...prev[event.agent], status: 'error' }
        }))
      } else if (event.type === 'all_done') {
        setDone(true)
        setRunning(false)
      } else if (event.type === 'error') {
        setError(event.message)
        setRunning(false)
      }
    }

    ws.onerror = () => {
      setError('WebSocket connection failed. Make sure the backend is running on port 8000.')
      setRunning(false)
    }

    ws.onclose = () => {
      if (running) setRunning(false)
    }
  }, [repoUrl, running])

  const stop = () => {
    wsRef.current?.close()
    setRunning(false)
    setStatusMsg('Stopped.')
  }

  const completedCount = Object.values(agents).filter(a => a.status === 'done').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(8, 11, 15, 0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', color: 'var(--accent)' }}>⬡</span>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}>
            CodeAgent
          </span>
          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent)',
            background: 'var(--accent-glow)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            padding: '2px 7px',
            borderRadius: '4px',
          }}>
            MULTI-AGENT
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Llama-3.3-70b · Groq
          </span>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>

        {/* Hero */}
        {!running && !done && !repoInfo && (
          <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fadeUp 0.4s ease' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '42px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '12px',
            }}>
              AI Code Review
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '500px', margin: '0 auto' }}>
              4 specialized AI agents analyze your GitHub repository in parallel —
              summarizing architecture, finding bugs, auditing security, and writing docs.
            </p>
          </div>
        )}

        {/* Input */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '16px',
          animation: 'fadeUp 0.4s ease 0.1s both',
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-2)',
            border: `1px solid ${running ? 'var(--border-active)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            padding: '0 14px',
            transition: 'border-color 0.2s',
          }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
              github.com/
            </span>
            <input
              value={repoUrl.replace('https://github.com/', '')}
              onChange={e => setRepoUrl('https://github.com/' + e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze()}
              placeholder="owner/repository"
              disabled={running}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontFamily: 'var(--font-mono)',
                padding: '13px 0',
              }}
            />
          </div>
          <button
            onClick={running ? stop : analyze}
            disabled={!running && !repoUrl.trim()}
            style={{
              padding: '0 24px',
              borderRadius: 'var(--radius)',
              border: 'none',
              cursor: !running && !repoUrl.trim() ? 'not-allowed' : 'pointer',
              background: running
                ? 'rgba(255, 82, 82, 0.15)'
                : repoUrl.trim()
                ? 'var(--accent)'
                : 'var(--bg-3)',
              color: running ? 'var(--error)' : repoUrl.trim() ? '#000' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {running ? '■ Stop' : '▶ Analyze'}
          </button>
        </div>

        {/* Examples */}
        {!running && !done && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '32px',
            animation: 'fadeUp 0.4s ease 0.2s both',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>Try:</span>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setRepoUrl(ex)}
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '5px',
                  padding: '4px 10px',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-active)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {ex.replace('https://github.com/', '')}
              </button>
            ))}
          </div>
        )}

        {/* Status */}
        {statusMsg && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
            {statusMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255, 82, 82, 0.08)',
            border: '1px solid rgba(255, 82, 82, 0.25)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            color: 'var(--error)',
            marginBottom: '16px',
            animation: 'fadeUp 0.2s ease',
          }}>
            ✗ {error}
          </div>
        )}

        {/* Repo Info */}
        {repoInfo && <div style={{ marginBottom: '16px' }}><RepoInfo info={repoInfo} /></div>}

        {/* Progress bar */}
        {running && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Agent progress
              </span>
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                {completedCount}/{AGENTS.length}
              </span>
            </div>
            <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px' }}>
              <div style={{
                height: '100%',
                width: `${(completedCount / AGENTS.length) * 100}%`,
                background: 'var(--accent)',
                borderRadius: '2px',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        )}

        {/* Agent Cards */}
        {(running || done || repoInfo) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {AGENTS.map((agent, i) => (
              <AgentCard
                key={agent}
                agent={agent}
                status={agents[agent].status}
                content={agents[agent].content}
                index={i}
              />
            ))}
          </div>
        )}

        {/* Done banner */}
        {done && (
          <div style={{
            marginTop: '20px',
            padding: '16px 20px',
            background: 'rgba(0, 230, 118, 0.06)',
            border: '1px solid rgba(0, 230, 118, 0.2)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeUp 0.3s ease',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>
                ✓ Analysis complete
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                All 4 agents finished — expand each card to read the results
              </div>
            </div>
            <button
              onClick={() => { reset(); setRepoUrl('') }}
              style={{
                padding: '8px 16px',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
              }}
            >
              Analyze another
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
