from fastapi import FastAPI
from src.config import settings  # noqa: F401 — triggers .env load + validation at startup
from src.middleware.x402 import X402Middleware
from src.tools.static_analysis import AnalysisInput, run_analysis

app = FastAPI(title="Hedera x402 MCP Proxy")
app.add_middleware(X402Middleware)

REGISTERED_TOOLS = [
    {
        "name": "execute-static-analysis",
        "description": (
            "Runs pyflakes and bandit on a Python code snippet. "
            "Returns quality issues and security vulnerabilities."
        ),
    }
]


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/mcp/tools")
async def list_tools():
    return {"tools": REGISTERED_TOOLS}


@app.post("/mcp/tools/execute-static-analysis")
async def run_static_analysis(body: AnalysisInput):
    return run_analysis(body.code, body.language)
