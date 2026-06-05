from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings  # noqa: F401 — triggers .env load + validation at startup
from src.demo import router as demo_router
from src.middleware.x402 import X402Middleware
from src.tools.static_analysis import AnalysisInput, run_analysis

app = FastAPI(title="Hedera x402 MCP Proxy")
app.add_middleware(X402Middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(demo_router, prefix="/demo")

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
async def run_static_analysis(body: AnalysisInput, request: Request):
    if request.headers.get("x-demo-inject-failure") == "true":
        raise HTTPException(status_code=503, detail="demo_injected_failure")
    return run_analysis(body.code, body.language)
