import ast
import json
import os
import subprocess
import sys
import tempfile

from fastapi import HTTPException
from pydantic import BaseModel

SUPPORTED_LANGUAGES = ["python"]


class AnalysisInput(BaseModel):
    code: str
    language: str


def run_analysis(code: str, language: str) -> dict:
    if not code.strip():
        raise HTTPException(status_code=400, detail="'code' must not be empty")
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: '{language}'. Supported: {SUPPORTED_LANGUAGES}",
        )

    issues = []

    # Stage 1 — syntax
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {
            "tool": "execute-static-analysis",
            "language": language,
            "issues": [
                {
                    "severity": "error",
                    "type": "syntax",
                    "line": e.lineno,
                    "message": e.msg,
                }
            ],
            "summary": {"total": 1, "errors": 1, "warnings": 0, "security": 0},
        }

    # Stage 2 — quality (pyflakes)
    try:
        from pyflakes.checker import Checker

        for msg in Checker(tree, "<input>").messages:
            issues.append(
                {
                    "severity": "warning",
                    "type": "pyflakes",
                    "line": msg.lineno,
                    "message": msg.message % msg.message_args,
                }
            )
    except Exception:
        pass

    # Stage 3 — security (bandit)
    tmp_path = None
    try:
        bandit_bin = os.path.join(os.path.dirname(sys.executable), "bandit")
        with tempfile.NamedTemporaryFile(
            suffix=".py", mode="w", delete=False
        ) as tmp:
            tmp.write(code)
            tmp_path = tmp.name

        result = subprocess.run(
            [bandit_bin, "-f", "json", "-q", tmp_path],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.stdout:
            for item in json.loads(result.stdout).get("results", []):
                issues.append(
                    {
                        "severity": item["issue_severity"].lower(),
                        "type": "bandit",
                        "line": item["line_number"],
                        "message": item["issue_text"],
                        "test_id": item["test_id"],
                    }
                )
    except Exception:
        pass
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    errors = sum(1 for i in issues if i["severity"] == "error")
    warnings = sum(1 for i in issues if i["severity"] == "warning")
    security = sum(1 for i in issues if i["type"] == "bandit")

    return {
        "tool": "execute-static-analysis",
        "language": language,
        "issues": issues,
        "summary": {
            "total": len(issues),
            "errors": errors,
            "warnings": warnings,
            "security": security,
        },
    }
