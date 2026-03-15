import httpx
import base64
from typing import Dict, List


SKIP_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2",
    ".ttf", ".eot", ".mp4", ".mp3", ".zip", ".tar", ".gz", ".pdf",
    ".lock", ".min.js", ".min.css",
}

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "dist",
    "build", ".next", ".nuxt", "coverage", ".pytest_cache",
}

MAX_FILE_SIZE = 50_000  # 50KB per file
MAX_TOTAL_CHARS = 80_000  # total context limit


async def fetch_github_repo(repo_url: str, token: str = "") -> Dict:
    """Fetch files from a GitHub repo URL."""
    # Parse owner/repo from URL
    url = repo_url.rstrip("/")
    if "github.com" not in url:
        raise ValueError("Please provide a valid GitHub URL")

    parts = url.replace("https://github.com/", "").replace("http://github.com/", "").split("/")
    if len(parts) < 2:
        raise ValueError("Invalid GitHub URL format. Expected: https://github.com/owner/repo")

    owner, repo = parts[0], parts[1]

    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"

    async with httpx.AsyncClient(timeout=30) as client:
        # Get repo info
        repo_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        if repo_res.status_code == 404:
            raise ValueError(f"Repository not found: {owner}/{repo}")
        repo_data = repo_res.json()

        # Get file tree
        tree_res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
            headers=headers,
        )
        if tree_res.status_code != 200:
            raise ValueError("Failed to fetch repository tree")

        tree = tree_res.json().get("tree", [])

        # Filter and fetch files
        files = {}
        total_chars = 0

        for item in tree:
            if item["type"] != "blob":
                continue

            path = item["path"]

            # Skip unwanted dirs
            if any(skip in path.split("/") for skip in SKIP_DIRS):
                continue

            # Skip unwanted extensions
            if any(path.endswith(ext) for ext in SKIP_EXTENSIONS):
                continue

            # Skip very large files
            if item.get("size", 0) > MAX_FILE_SIZE:
                continue

            if total_chars >= MAX_TOTAL_CHARS:
                break

            # Fetch file content
            file_res = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{path}",
                headers=headers,
            )
            if file_res.status_code != 200:
                continue

            file_data = file_res.json()
            if file_data.get("encoding") == "base64":
                try:
                    content = base64.b64decode(file_data["content"]).decode("utf-8", errors="ignore")
                    files[path] = content
                    total_chars += len(content)
                except Exception:
                    continue

        return {
            "owner": owner,
            "repo": repo,
            "description": repo_data.get("description", ""),
            "language": repo_data.get("language", ""),
            "stars": repo_data.get("stargazers_count", 0),
            "files": files,
            "file_count": len(files),
        }


def format_files_for_prompt(files: Dict[str, str], max_chars: int = 60_000) -> str:
    """Format files into a readable string for the LLM."""
    parts = []
    total = 0
    for path, content in files.items():
        chunk = f"### {path}\n```\n{content[:3000]}\n```\n"
        if total + len(chunk) > max_chars:
            parts.append("... (additional files truncated for context limit)")
            break
        parts.append(chunk)
        total += len(chunk)
    return "\n".join(parts)
