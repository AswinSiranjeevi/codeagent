from typing import TypedDict, AsyncGenerator
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser


# ── State shared between all agents ──────────────────────────────────────────

class AgentState(TypedDict):
    repo_info: dict
    code_context: str
    summary: str
    bugs: str
    readme: str
    security: str
    current_agent: str
    error: str


# ── Agent prompts ─────────────────────────────────────────────────────────────

SUMMARIZER_PROMPT = """You are an expert software engineer analyzing a codebase.

Repository: {repo_name}
Description: {description}
Primary Language: {language}

Code Files:
{code_context}

Provide a comprehensive technical summary covering:
1. **Purpose & Overview** — What does this project do?
2. **Architecture** — How is the code structured? Key design patterns used?
3. **Tech Stack** — Languages, frameworks, libraries detected
4. **Key Components** — Most important files/modules and their roles
5. **Data Flow** — How data moves through the system

Be specific and technical. Reference actual file names and functions you see."""


BUG_DETECTOR_PROMPT = """You are a senior code reviewer specializing in finding bugs, vulnerabilities, and code quality issues.

Repository: {repo_name}
Code Files:
{code_context}

Perform a thorough code review and identify:

1. **Critical Bugs** — Logic errors, null pointer issues, race conditions, crashes
2. **Security Vulnerabilities** — SQL injection, XSS, exposed secrets, insecure dependencies  
3. **Performance Issues** — N+1 queries, memory leaks, inefficient algorithms, blocking calls
4. **Code Quality** — Dead code, duplicated logic, poor error handling, missing validation
5. **Suggested Fixes** — For each issue, provide the specific fix with corrected code

Format each issue as:
- **[SEVERITY: Critical/High/Medium/Low]** `filename:line` — Description
  - Fix: explanation + corrected code snippet

If no issues found in a category, say "None detected." Be specific and reference actual code."""


README_GENERATOR_PROMPT = """You are a technical writer creating a professional README for a GitHub repository.

Repository: {repo_name}
Description: {description}
Language: {language}
Stars: {stars}

Code Summary:
{summary}

Code Files:
{code_context}

Generate a complete, professional README.md that includes:

1. A compelling project title and description
2. Badges (build status, language, license)
3. Features list
4. Tech stack
5. Prerequisites
6. Installation & Quick Start (with actual commands based on the code)
7. Usage examples with code snippets
8. API documentation (if applicable)
9. Project structure
10. Contributing guidelines
11. License

Make it look like a real open-source project README. Use proper markdown formatting."""


SECURITY_PROMPT = """You are a cybersecurity expert performing a security audit.

Repository: {repo_name}
Code Files:
{code_context}

Perform a security audit covering:

1. **Authentication & Authorization** — Are there proper access controls?
2. **Input Validation** — Is user input sanitized and validated?
3. **Secrets Management** — Are API keys, passwords, or tokens hardcoded?
4. **Dependency Security** — Any known vulnerable packages?
5. **API Security** — Rate limiting, CORS, HTTPS enforcement?
6. **Data Security** — Is sensitive data encrypted? Proper data handling?
7. **Security Score** — Rate overall security: Poor / Fair / Good / Excellent

For each finding provide:
- Risk level: 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low
- Location in code
- Recommended remediation"""


# ── Agent nodes ───────────────────────────────────────────────────────────────

def make_agent_node(prompt_template: str, output_key: str, agent_name: str):
    async def node(state: AgentState, llm: ChatGroq) -> AgentState:
        repo_info = state["repo_info"]
        prompt = ChatPromptTemplate.from_template(prompt_template)
        chain = prompt | llm | StrOutputParser()

        result = await chain.ainvoke({
            "repo_name": f"{repo_info['owner']}/{repo_info['repo']}",
            "description": repo_info.get("description", "No description"),
            "language": repo_info.get("language", "Unknown"),
            "stars": repo_info.get("stars", 0),
            "code_context": state["code_context"],
            "summary": state.get("summary", ""),
        })

        return {**state, output_key: result, "current_agent": agent_name}
    return node


# ── Streaming orchestrator ────────────────────────────────────────────────────

class MultiAgentOrchestrator:
    AGENTS = [
        ("summarizer", "summary", SUMMARIZER_PROMPT, "Code Summarizer"),
        ("bug_detector", "bugs", BUG_DETECTOR_PROMPT, "Bug Detector"),
        ("security_auditor", "security", SECURITY_PROMPT, "Security Auditor"),
        ("readme_generator", "readme", README_GENERATOR_PROMPT, "README Generator"),
    ]

    def __init__(self, groq_api_key: str, model: str):
        self.llm = ChatGroq(
            model=model,
            groq_api_key=groq_api_key,
            streaming=True,
            temperature=0.1,
        )

    async def run(self, repo_info: dict, code_context: str) -> AsyncGenerator[dict, None]:
        state: AgentState = {
            "repo_info": repo_info,
            "code_context": code_context,
            "summary": "",
            "bugs": "",
            "readme": "",
            "security": "",
            "current_agent": "",
            "error": "",
        }

        for node_name, output_key, prompt_template, agent_label in self.AGENTS:
            # Signal agent start
            yield {"type": "agent_start", "agent": agent_label, "key": output_key}

            prompt = ChatPromptTemplate.from_template(prompt_template)
            chain = prompt | self.llm | StrOutputParser()

            repo = repo_info
            full_output = ""

            try:
                async for chunk in chain.astream({
                    "repo_name": f"{repo['owner']}/{repo['repo']}",
                    "description": repo.get("description", "No description"),
                    "language": repo.get("language", "Unknown"),
                    "stars": repo.get("stars", 0),
                    "code_context": code_context,
                    "summary": state.get("summary", ""),
                }):
                    full_output += chunk
                    yield {"type": "token", "agent": agent_label, "key": output_key, "content": chunk}

                state[output_key] = full_output
                yield {"type": "agent_done", "agent": agent_label, "key": output_key}

            except Exception as e:
                yield {"type": "agent_error", "agent": agent_label, "error": str(e)}

        yield {"type": "all_done", "summary": state["summary"], "bugs": state["bugs"],
               "readme": state["readme"], "security": state["security"]}