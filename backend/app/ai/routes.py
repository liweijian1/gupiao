from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from ..config import (
    AI_ADMIN_PASSWORD,
    AI_ANALYSIS_CACHE_DIR,
    AI_ANALYSIS_PASSWORD,
    AI_CONFIG_PATH,
)
from .cache import AiAnalysisCache
from .client import AiUpstreamError, OpenAiCompatibleClient
from .config_store import AiConfigStore, verify_secret
from .models import AiConfigInput
from .service import AiAnalysisService, load_analysis_context


router = APIRouter(prefix="/api/ai", tags=["ai"])


class AnalyzeRequest(BaseModel):
    ticker: str
    lang: Literal["zh", "en"] = "zh"
    force: bool = False


def get_ai_store():
    return AiConfigStore(AI_CONFIG_PATH)


def get_ai_client():
    return OpenAiCompatibleClient()


def get_ai_service(store=Depends(get_ai_store), client=Depends(get_ai_client)):
    return AiAnalysisService(
        store,
        AiAnalysisCache(AI_ANALYSIS_CACHE_DIR),
        client,
        load_analysis_context,
    )


def require_admin_password(x_ai_admin_password: str | None = Header(default=None)):
    if not verify_secret(x_ai_admin_password, AI_ADMIN_PASSWORD):
        raise HTTPException(401, detail={"code": "invalid_admin_password"})


def require_analysis_password(x_ai_analysis_password: str | None = Header(default=None)):
    if not verify_secret(x_ai_analysis_password, AI_ANALYSIS_PASSWORD):
        raise HTTPException(401, detail={"code": "invalid_analysis_password"})


@router.get("/config/status")
def config_status(store=Depends(get_ai_store)):
    return store.status()


@router.post("/config/test", dependencies=[Depends(require_admin_password)])
def test_config(candidate: AiConfigInput, store=Depends(get_ai_store), client=Depends(get_ai_client)):
    try:
        config = store.resolve(candidate)
        latency_ms = client.test_connection(config)
        return {"ok": True, "model": config.model, "latency_ms": latency_ms}
    except ValueError as error:
        raise HTTPException(422, detail={"code": "invalid_ai_config"}) from error
    except AiUpstreamError as error:
        raise HTTPException(
            error.status_code,
            detail={"code": error.code, "retry_after": error.retry_after},
        ) from error


@router.put("/config", dependencies=[Depends(require_admin_password)])
def save_config(candidate: AiConfigInput, store=Depends(get_ai_store)):
    try:
        store.save(candidate)
        return store.status()
    except ValueError as error:
        raise HTTPException(422, detail={"code": "invalid_ai_config"}) from error


@router.post("/analyze", dependencies=[Depends(require_analysis_password)])
def analyze(request: AnalyzeRequest, service=Depends(get_ai_service)):
    try:
        return service.analyze(request.ticker, request.lang, request.force)
    except AiUpstreamError as error:
        raise HTTPException(
            error.status_code,
            detail={"code": error.code, "retry_after": error.retry_after},
        ) from error
    except RuntimeError as error:
        if str(error) == "ai_not_configured":
            raise HTTPException(409, detail={"code": "ai_not_configured"}) from error
        raise
    except ValueError as error:
        raise HTTPException(422, detail={"code": str(error)}) from error


@router.get("/analysis/{ticker}", dependencies=[Depends(require_analysis_password)])
def cached_analysis(
    ticker: str,
    lang: Literal["zh", "en"] = "zh",
    service=Depends(get_ai_service),
):
    try:
        result = service.get_cached(ticker, lang)
    except RuntimeError as error:
        if str(error) == "ai_not_configured":
            raise HTTPException(409, detail={"code": "ai_not_configured"}) from error
        raise
    if result is None:
        raise HTTPException(404, detail={"code": "analysis_not_found"})
    return result
