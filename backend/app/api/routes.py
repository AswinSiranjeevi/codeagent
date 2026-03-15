import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from app.config import get_settings
from app.agents.github_fetcher import fetch_github_repo, format_files_for_prompt
from app.agents.orchestrator import MultiAgentOrchestrator

router = APIRouter()


class AnalyzeRequest(BaseModel):
    repo_url: str


@router.get("/health")
async def health():
    return {"status": "ok", "service": "CodeAgent Multi-Agent System"}


@router.websocket("/analyze")
async def analyze_websocket(websocket: WebSocket):
    await websocket.accept()
    settings = get_settings()

    try:
        # Receive repo URL from client
        data = await websocket.receive_text()
        payload = json.loads(data)
        repo_url = payload.get("repo_url", "").strip()

        if not repo_url:
            await websocket.send_text(json.dumps({"type": "error", "message": "No repo URL provided"}))
            return

        # Fetch repo
        await websocket.send_text(json.dumps({
            "type": "status",
            "message": f"Fetching repository: {repo_url}"
        }))

        try:
            repo_info = await fetch_github_repo(repo_url, settings.github_token)
        except ValueError as e:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
            return

        await websocket.send_text(json.dumps({
            "type": "repo_info",
            "data": {
                "owner": repo_info["owner"],
                "repo": repo_info["repo"],
                "description": repo_info["description"],
                "language": repo_info["language"],
                "stars": repo_info["stars"],
                "file_count": repo_info["file_count"],
            }
        }))

        # Format code for prompt
        code_context = format_files_for_prompt(repo_info["files"])

        # Run multi-agent pipeline
        orchestrator = MultiAgentOrchestrator(
            groq_api_key=settings.groq_api_key,
            model=settings.llm_model,
        )

        async for event in orchestrator.run(repo_info, code_context):
            await websocket.send_text(json.dumps(event))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
