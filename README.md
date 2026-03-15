# CodeAgent — Multi-Agent AI Code Review

> Paste a GitHub repo URL. Watch 4 specialized AI agents analyze it simultaneously — summarizing architecture, finding bugs, auditing security, and generating documentation.

![CI](https://github.com/YOUR_USERNAME/codeagent/actions/workflows/ci.yml/badge.svg)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-0.2-1C3C3C)
![Groq](https://img.shields.io/badge/Groq-Llama--3.3--70b-orange)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

---

## Architecture

```
User → React Frontend (WebSocket)
           ↓
       FastAPI Backend
           ↓
   GitHub API (fetch files)
           ↓
   LangGraph Multi-Agent Pipeline
   ┌──────────────────────────────┐
   │  Agent 1: Code Summarizer    │ → Architecture, tech stack, key components
   │  Agent 2: Bug Detector       │ → Logic errors, null refs, perf issues
   │  Agent 3: Security Auditor   │ → Vulns, secrets, OWASP issues
   │  Agent 4: README Generator   │ → Full professional README.md
   └──────────────────────────────┘
           ↓ (streaming via WebSocket)
       React UI with live agent cards
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, WebSocket streaming |
| Backend | FastAPI + Uvicorn |
| Agent Orchestration | LangGraph |
| LLM | Llama-3.3-70b via Groq API |
| Repo Fetching | GitHub REST API v3 |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## Features

- **4 specialized agents** — each focused on a single task for better output quality
- **Real-time streaming** — watch agents think token-by-token via WebSocket
- **Smart repo parsing** — skips binaries, node_modules, large files automatically
- **Collapsible agent cards** — clean UI to read each agent's full output
- **Example repos** — one-click to try with popular open source projects
- **Docker Compose** — one command to run everything

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Free Groq API key from [console.groq.com](https://console.groq.com/keys)
- Optional: GitHub token (increases API rate limit from 60 to 5000 req/hr)

### Run with Docker

```bash
git clone https://github.com/YOUR_USERNAME/codeagent.git
cd codeagent
cp .env.example .env
# Edit .env with your GROQ_API_KEY
docker compose up --build
```

Open **http://localhost:3000**

---

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
echo "GROQ_API_KEY=gsk_..." > .env
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## How It Works

1. **Fetch** — GitHub REST API downloads all non-binary files from the repo (up to 80K chars)
2. **Chunk** — Files are formatted into a structured prompt context with file paths
3. **Agent 1: Summarizer** — Analyzes architecture, tech stack, and code structure
4. **Agent 2: Bug Detector** — Reviews every file for logic errors, null refs, race conditions, and performance issues
5. **Agent 3: Security Auditor** — Checks for OWASP Top 10, exposed secrets, insecure deps, missing auth
6. **Agent 4: README Generator** — Uses the summary + code to write a full professional README
7. **Stream** — Every agent streams tokens back via WebSocket to the React UI in real time

---

## Project Structure

```
codeagent/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app
│   │   ├── config.py             # Settings
│   │   ├── agents/
│   │   │   ├── orchestrator.py   # LangGraph multi-agent pipeline
│   │   │   └── github_fetcher.py # GitHub API integration
│   │   └── api/
│   │       └── routes.py         # WebSocket endpoint
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx               # Main UI with WebSocket client
│       └── components/
│           ├── AgentCard.jsx     # Streaming agent output card
│           └── RepoInfo.jsx      # Repo metadata banner
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ | Get free at console.groq.com/keys |
| `GITHUB_TOKEN` | Optional | Increases rate limit to 5000 req/hr |
| `LLM_MODEL` | Optional | Default: `llama-3.3-70b-versatile` |

---

## License

MIT
