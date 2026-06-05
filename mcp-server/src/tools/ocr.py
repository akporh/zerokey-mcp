import os

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, field_validator

OCR_API_URL = "https://api.ocr.space/parse/image"


class OcrInput(BaseModel):
    image_url: str

    @field_validator("image_url")
    @classmethod
    def must_be_https(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("image_url must be an HTTPS URL")
        return v


def _filetype_from_url(url: str) -> str:
    ext = url.rsplit(".", 1)[-1].split("?")[0].upper()
    return ext if ext in {"JPG", "JPEG", "PNG", "GIF", "BMP", "PDF", "TIFF"} else "JPG"


async def run_ocr(image_url: str) -> dict:
    api_key = os.environ["OCR_SPACE_API_KEY"]
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(
            OCR_API_URL,
            data={
                "url": image_url,
                "apikey": api_key,
                "language": "eng",
                "filetype": _filetype_from_url(image_url),
            },
        )
    if r.status_code != 200:
        raise HTTPException(status_code=503, detail="ocr_upstream_error")
    payload = r.json()
    if payload.get("IsErroredOnProcessing"):
        raise HTTPException(status_code=503, detail="ocr_upstream_error")
    text = " ".join(
        page.get("ParsedText", "") for page in payload.get("ParsedResults", [])
    ).strip()
    return {
        "tool": "ocr-extract",
        "text": text,
        "word_count": len(text.split()) if text else 0,
    }
