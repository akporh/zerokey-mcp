"""Hedera Mirror Node query tools — no API key required."""

import base64
import datetime

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, Field

from src.config import settings
from src.validation.mirror_node import _normalize_tx_id

_TIMEOUT = 10
_NETWORK = settings.get("HEDERA_NETWORK", "testnet")
_MIRROR  = settings["MIRROR_NODE_URL"]
_HASHSCAN = f"https://hashscan.io/{_NETWORK}"


def _ts_to_iso(ts: str) -> str:
    """Convert '1780744916.386039007' → '2026-06-06T11:21:56Z'."""
    try:
        return datetime.datetime.utcfromtimestamp(float(ts)).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return ts


async def _get(path: str, params: dict | None = None) -> dict:
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(f"{_MIRROR}{path}", params=params)
    except httpx.TimeoutException:
        raise HTTPException(status_code=503, detail="mirror_node_timeout")
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="mirror_node_unreachable")
    return r


# --- Input models -----------------------------------------------------------

class AccountInfoInput(BaseModel):
    account_id: str


class TokenLookupInput(BaseModel):
    token_id: str


class HcsTopicInput(BaseModel):
    topic_id: str
    limit: int = Field(default=10, ge=1, le=100)


class TransactionInput(BaseModel):
    transaction_id: str


# --- Tool functions ---------------------------------------------------------

async def get_account_info(account_id: str) -> dict:
    r = await _get(f"/api/v1/accounts/{account_id}")
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="account_not_found")
    if r.status_code != 200:
        raise HTTPException(status_code=503, detail="mirror_node_error")
    d = r.json()
    balance_tinybars = d.get("balance", {}).get("balance", 0)
    key = d.get("key", {})
    return {
        "tool": "get-account-info",
        "account_id": d.get("account"),
        "balance_hbar": round(balance_tinybars / 100_000_000, 8),
        "key_type": key.get("_type"),
        "created_timestamp": _ts_to_iso(d.get("created_timestamp", "")),
        "evm_address": d.get("evm_address"),
        "alias": d.get("alias"),
        "hashscan_url": f"{_HASHSCAN}/account/{account_id}",
    }


async def lookup_token(token_id: str) -> dict:
    r = await _get(f"/api/v1/tokens/{token_id}")
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="token_not_found")
    if r.status_code != 200:
        raise HTTPException(status_code=503, detail="mirror_node_error")
    d = r.json()
    return {
        "tool": "lookup-token",
        "token_id": d.get("token_id"),
        "name": d.get("name"),
        "symbol": d.get("symbol"),
        "type": d.get("type"),
        "total_supply": d.get("total_supply"),
        "decimals": d.get("decimals"),
        "treasury_account": d.get("treasury_account_id"),
        "created_timestamp": _ts_to_iso(d.get("created_timestamp", "")),
        "hashscan_url": f"{_HASHSCAN}/token/{token_id}",
    }


async def read_hcs_topic(topic_id: str, limit: int = 10) -> dict:
    r = await _get(f"/api/v1/topics/{topic_id}/messages", {"limit": limit, "order": "desc"})
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="topic_not_found")
    if r.status_code != 200:
        raise HTTPException(status_code=503, detail="mirror_node_error")
    raw_messages = r.json().get("messages", [])
    messages = []
    for m in raw_messages:
        raw = m.get("message", "")
        try:
            decoded = base64.b64decode(raw).decode("utf-8")
        except Exception:
            decoded = raw
        try:
            import json as _json
            decoded = _json.loads(decoded)
        except Exception:
            pass
        if isinstance(decoded, dict) and decoded.get("tx_id") and "@" in str(decoded["tx_id"]):
            account, timestamp = decoded["tx_id"].split("@")
            seconds, nanos = timestamp.split(".")
            decoded["hashscan_tx_url"] = f"{_HASHSCAN}/transaction/{account}-{seconds}-{nanos}"
        messages.append({
            "sequence_number": m.get("sequence_number"),
            "consensus_timestamp": _ts_to_iso(m.get("consensus_timestamp", "")),
            "message": decoded,
        })
    return {
        "tool": "read-hcs-topic",
        "topic_id": topic_id,
        "message_count": len(messages),
        "messages": messages,
        "hashscan_url": f"{_HASHSCAN}/topic/{topic_id}",
    }


async def get_transaction(transaction_id: str) -> dict:
    # Accept both 0.0.X@sec.nano and 0.0.X-sec-nano formats
    if "@" in transaction_id:
        normalized = _normalize_tx_id(transaction_id)
    else:
        normalized = transaction_id
    r = await _get(f"/api/v1/transactions/{normalized}")
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="transaction_not_found")
    if r.status_code != 200:
        raise HTTPException(status_code=503, detail="mirror_node_error")
    txs = r.json().get("transactions", [])
    if not txs:
        raise HTTPException(status_code=404, detail="transaction_not_found")
    tx = txs[0]
    memo_raw = tx.get("memo_base64", "")
    try:
        memo = base64.b64decode(memo_raw).decode("utf-8") if memo_raw else ""
    except Exception:
        memo = memo_raw
    fee_tinybars = tx.get("charged_tx_fee", 0)
    return {
        "tool": "get-transaction",
        "transaction_id": tx.get("transaction_id"),
        "type": tx.get("name"),
        "result": tx.get("result"),
        "consensus_timestamp": _ts_to_iso(tx.get("consensus_timestamp", "")),
        "fee_hbar": round(fee_tinybars / 100_000_000, 8),
        "memo": memo,
        "entity_id": tx.get("entity_id"),
        "transfers": tx.get("transfers", []),
        "hashscan_url": f"{_HASHSCAN}/transaction/{normalized}",
    }
