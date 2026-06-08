"""Rich terminal output for demo screen recording."""

import sys
import time

# ANSI codes — no external deps
_R  = "\033[0m"
_B  = "\033[1m"
_DIM = "\033[2m"
_YEL = "\033[93m"
_GRN = "\033[92m"
_CYN = "\033[96m"
_RED = "\033[91m"
_MGT = "\033[95m"
_WHT = "\033[97m"

_W = 62  # box width

_TOOL_NAMES = {
    "/mcp/tools/execute-static-analysis": "scan_code",
    "/mcp/tools/ocr-extract":             "ocr_extract",
    "/mcp/tools/get-account-info":        "get_account_info",
    "/mcp/tools/lookup-token":            "lookup_token",
    "/mcp/tools/read-hcs-topic":          "read_hcs_topic",
    "/mcp/tools/get-transaction":         "get_transaction",
    "/mcp/tools/demo-fail":               "demo_fail",
}


def _ts() -> str:
    return time.strftime("%H:%M:%S")


def _box(lines: list[str], colour: str) -> str:
    top    = f"{colour}╔{'═' * _W}╗{_R}"
    bottom = f"{colour}╚{'═' * _W}╝{_R}"
    rows   = []
    for line in lines:
        # strip ANSI for width calculation
        import re
        plain = re.sub(r"\033\[[0-9;]*m", "", line)
        pad = _W - len(plain)
        rows.append(f"{colour}║{_R} {line}{' ' * max(pad - 1, 0)} {colour}║{_R}")
    return "\n".join([top] + rows + [bottom])


def _print(box: str) -> None:
    print(f"\n{box}\n", file=sys.stderr, flush=True)


def challenge(tool_path: str, price_hbar: float) -> None:
    name = _TOOL_NAMES.get(tool_path, tool_path)
    lines = [
        f"{_YEL}{_B}⚡  PAYMENT REQUIRED{_R}                          {_DIM}{_ts()}{_R}",
        f"   Tool   : {_WHT}{_B}{name}{_R}",
        f"   Price  : {_YEL}{_B}{price_hbar:.2f} HBAR{_R}",
        f"   Status : {_DIM}Issuing 402 challenge → waiting for payment…{_R}",
    ]
    _print(_box(lines, _YEL))


def payment_verified(payer: str, price_hbar: float, tx_id: str, mode: str = "receipt") -> None:
    short_tx = tx_id[:46] + "…" if len(tx_id) > 47 else tx_id
    lines = [
        f"{_GRN}{_B}💸  PAYMENT VERIFIED ON HEDERA TESTNET{_R}        {_DIM}{_ts()}{_R}",
        f"   Amount : {_GRN}{_B}{price_hbar:.2f} HBAR{_R}",
        f"   Payer  : {_WHT}{payer}{_R}",
        f"   Tx     : {_DIM}{short_tx}{_R}",
        f"   Mode   : {_DIM}{mode}{_R}",
    ]
    _print(_box(lines, _GRN))


def tool_executed(tool_path: str, topic_id: str) -> None:
    name = _TOOL_NAMES.get(tool_path, tool_path)
    lines = [
        f"{_CYN}{_B}✅  TOOL EXECUTED{_R}                             {_DIM}{_ts()}{_R}",
        f"   Tool   : {_WHT}{_B}{name}{_R}",
        f"   Audit  : {_DIM}HCS topic {topic_id}{_R}",
        f"   Verify : {_CYN}hashscan.io/testnet/topic/{topic_id}{_R}",
    ]
    _print(_box(lines, _CYN))


def tool_failed(tool_path: str, refund_status: str) -> None:
    name = _TOOL_NAMES.get(tool_path, tool_path)
    lines = [
        f"{_RED}{_B}❌  TOOL FAILED — REFUND DISPATCHED{_R}           {_DIM}{_ts()}{_R}",
        f"   Tool   : {_WHT}{name}{_R}",
        f"   Refund : {_DIM}{refund_status}{_R}",
    ]
    _print(_box(lines, _RED))


def startup(proxy_url: str, tools: list[str]) -> None:
    tool_lines = [f"   {_MGT}•{_R}  {t}" for t in tools]
    lines = [
        f"{_MGT}{_B}🔑  ZEROKEY x402 PROXY — HEDERA TESTNET{_R}      {_DIM}{_ts()}{_R}",
        f"   URL    : {_WHT}{proxy_url}{_R}",
        f"   Tools  :",
        *tool_lines,
    ]
    _print(_box(lines, _MGT))
