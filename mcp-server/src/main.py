from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from src.admin.router import router as admin_router
from src.config import settings  # noqa: F401 — triggers .env load + validation at startup
from src.demo import router as demo_router
from src.middleware.x402 import X402Middleware
from src.registry import TOOL_REGISTRY
from src.tools.ocr import OcrInput, run_ocr
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
app.include_router(admin_router, prefix="/admin")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/mcp/tools")
async def list_tools():
    return {
        "tools": [
            {"name": entry["name"], "description": entry["description"], "price_hbar": entry["price_hbar"]}
            for entry in TOOL_REGISTRY.values()
        ]
    }


@app.post("/mcp/tools/execute-static-analysis")
async def run_static_analysis(body: AnalysisInput, request: Request):
    if request.headers.get("x-demo-inject-failure") == "true":
        raise HTTPException(status_code=503, detail="demo_injected_failure")
    return run_analysis(body.code, body.language)


@app.post("/mcp/tools/ocr-extract")
async def run_ocr_tool(body: OcrInput):
    return await run_ocr(body.image_url)
