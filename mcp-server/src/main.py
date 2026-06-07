import asyncio

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from src.admin.router import router as admin_router
from src.config import settings  # noqa: F401 — triggers .env load + validation at startup
from src.demo import router as demo_router
from src.middleware.x402 import X402Middleware
from src.registry import TOOL_REGISTRY
from src.tools.hedera_mirror import (
    AccountInfoInput, HcsTopicInput, TokenLookupInput, TransactionInput,
    get_account_info, get_transaction, lookup_token, read_hcs_topic,
)
import src.demo_log as demo_log
from src.tools.ocr import OcrInput, run_ocr
from src.tools.static_analysis import AnalysisInput, run_analysis

app = FastAPI(title="Hedera x402 MCP Proxy")

demo_log.startup(
    proxy_url="http://localhost:8000",
    tools=["scan_code", "get_account_info", "lookup_token", "read_hcs_topic", "get_transaction"],
)
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
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, run_analysis, body.code, body.language)


@app.post("/mcp/tools/ocr-extract")
async def run_ocr_tool(body: OcrInput):
    return await run_ocr(body.image_url)


@app.post("/mcp/tools/get-account-info")
async def get_account_info_tool(body: AccountInfoInput):
    return await get_account_info(body.account_id)


@app.post("/mcp/tools/lookup-token")
async def lookup_token_tool(body: TokenLookupInput):
    return await lookup_token(body.token_id)


@app.post("/mcp/tools/read-hcs-topic")
async def read_hcs_topic_tool(body: HcsTopicInput):
    return await read_hcs_topic(body.topic_id, body.limit)


@app.post("/mcp/tools/get-transaction")
async def get_transaction_tool(body: TransactionInput):
    return await get_transaction(body.transaction_id)
