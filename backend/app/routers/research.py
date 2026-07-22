from __future__ import annotations

from datetime import date
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from ..config import RESEARCH_DATA_DIR
from ..research.dataset import DatasetUnavailable
from ..research.models import BacktestRequest, DatasetRefreshRequest, FactorWeights
from ..research.service import ResearchService


router = APIRouter(prefix="/api/research", tags=["research"])


@lru_cache(maxsize=1)
def get_research_service() -> ResearchService:
    return ResearchService(RESEARCH_DATA_DIR)


def _translate_error(error: Exception) -> HTTPException:
    if isinstance(error, DatasetUnavailable):
        return HTTPException(status.HTTP_409_CONFLICT, detail={"code": "dataset_unavailable", "message": str(error)})
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail={"code": "research_invalid", "message": str(error)})


@router.get("/dataset")
def dataset(service: ResearchService = Depends(get_research_service)):
    try:
        return service.get_dataset()
    except Exception as error:
        raise _translate_error(error) from error


@router.post("/dataset/refresh", status_code=status.HTTP_202_ACCEPTED)
def refresh_dataset(request: DatasetRefreshRequest, service: ResearchService = Depends(get_research_service)):
    return service.refresh_dataset(request)


@router.get("/ranking")
def ranking(
    as_of: date | None = None,
    momentum: float = 68,
    quality: float = 52,
    valuation: float = 42,
    liquidity: float = 70,
    volatility: float = 39,
    service: ResearchService = Depends(get_research_service),
):
    try:
        return service.get_ranking(
            as_of,
            FactorWeights(
                momentum=momentum,
                quality=quality,
                valuation=valuation,
                liquidity=liquidity,
                volatility=volatility,
            ),
        )
    except Exception as error:
        raise _translate_error(error) from error


@router.post("/backtests", status_code=status.HTTP_202_ACCEPTED)
def backtests(request: BacktestRequest, service: ResearchService = Depends(get_research_service)):
    return service.start_backtest(request)


@router.get("/backtests/{job_id}")
def backtest_job(job_id: str, service: ResearchService = Depends(get_research_service)):
    job = service.get_job(job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail={"code": "research_job_not_found"})
    return job
