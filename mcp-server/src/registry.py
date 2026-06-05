TOOL_REGISTRY: dict[str, dict] = {
    "/mcp/tools/execute-static-analysis": {
        "name": "execute-static-analysis",
        "description": (
            "Runs pyflakes and bandit on a Python code snippet. "
            "Returns quality issues and security vulnerabilities."
        ),
        "price_hbar": 0.50,
        "required_env_key": None,
    },
    "/mcp/tools/ocr-extract": {
        "name": "ocr-extract",
        "description": "Extracts text from an image URL using OCR. Returns plain text and word count.",
        "price_hbar": 0.25,
        "required_env_key": "OCR_SPACE_API_KEY",
    },
}
