import json
import threading
from datetime import datetime, timezone
from hashlib import sha256

from ..service import get_macro_snapshot
from ..stocks import get_stock_snapshot


DISCLAIMERS = {
    "zh": "仅供研究参考，不构成投资建议。",
    "en": "For research reference only; not investment advice.",
}

SYSTEM_PROMPTS = {
    "zh": (
        "你是股票与宏观研究助手。只能使用用户提供的结构化数据，不得编造新闻、财务报表或目标价。"
        "缺失信息必须明确标为缺失。只返回一个 JSON 对象，不要 Markdown 代码围栏。"
        "对象必须包含 rating、position_range、summary、opportunities、risks、watchlist、disclaimer。"
        "rating 只能是 bullish、neutral、bearish；position_range 包含 0 到 100 的整数 min 和 max；"
        "opportunities 和 risks 各 1 到 3 条；watchlist 1 到 5 条，每条包含 name、value、reason。"
    ),
    "en": (
        "You are an equity and macro research assistant. Use only the supplied structured data. "
        "Do not invent news, financial statements, or price targets. Mark missing information explicitly. "
        "Return one JSON object without Markdown fences. The object must contain rating, position_range, "
        "summary, opportunities, risks, watchlist, and disclaimer. Rating must be bullish, neutral, or bearish; "
        "position_range contains integer min and max from 0 to 100; opportunities and risks contain 1 to 3 "
        "items each; watchlist contains 1 to 5 objects with name, value, and reason."
    ),
}


def load_analysis_context(ticker: str) -> dict:
    normalized = ticker.strip().upper()
    stock_snapshot = get_stock_snapshot()
    stock = next(
        (item for item in stock_snapshot.get("stocks", []) if str(item.get("ticker", "")).upper() == normalized),
        None,
    )
    if stock is None:
        raise ValueError("stock_not_found")
    macro = get_macro_snapshot()
    scores = macro.get("scores", {})
    series = [
        {
            "key": item.get("key"),
            "group": item.get("group"),
            "value": item.get("latest_value"),
            "unit": item.get("unit"),
            "score": item.get("score"),
        }
        for item in macro.get("series", [])[:13]
    ]
    return {
        "stock": {
            key: stock.get(key)
            for key in (
                "ticker", "name", "exchange", "sector", "currency", "price", "chg",
                "score", "pe", "growth", "rsi", "beta", "trend", "liquidity", "source",
            )
        },
        "macro": {
            "cycle": scores.get("cycle"),
            "economic_climate": scores.get("economic_climate"),
            "liquidity": scores.get("liquidity"),
            "inflation": scores.get("inflation"),
            "external_pressure": scores.get("external_pressure"),
            "series": series,
            "source": macro.get("source"),
        },
        "data_as_of": max(
            str(stock_snapshot.get("updated_at") or ""),
            str(macro.get("updated_at") or ""),
        ),
    }


class AiAnalysisService:
    def __init__(self, config_store, cache, client, context_loader):
        self.config_store = config_store
        self.cache = cache
        self.client = client
        self.context_loader = context_loader
        self._locks = {}
        self._locks_guard = threading.Lock()

    def _fingerprint(self, config) -> str:
        return sha256(f"{config.base_url}\n{config.model}".encode()).hexdigest()

    def _lock_for(self, key: str):
        with self._locks_guard:
            return self._locks.setdefault(key, threading.Lock())

    def get_cached(self, ticker: str, lang: str) -> dict | None:
        config = self.config_store.read()
        if not config:
            raise RuntimeError("ai_not_configured")
        payload = self.cache.read(ticker, lang, self._fingerprint(config))
        if payload:
            return {**payload, "cached": True}
        return None

    def analyze(self, ticker: str, lang: str, force: bool = False) -> dict:
        config = self.config_store.read()
        if not config:
            raise RuntimeError("ai_not_configured")
        fingerprint = self._fingerprint(config)
        if not force:
            cached = self.cache.read(ticker, lang, fingerprint)
            if cached:
                return {**cached, "cached": True}
        key = f"{ticker.upper()}:{lang}"
        with self._lock_for(key):
            if not force:
                cached = self.cache.read(ticker, lang, fingerprint)
                if cached:
                    return {**cached, "cached": True}
            context = self.context_loader(ticker)
            messages = [
                {"role": "system", "content": SYSTEM_PROMPTS[lang]},
                {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
            ]
            analysis = self.client.analyze(config, messages).model_copy(
                update={"disclaimer": DISCLAIMERS[lang]}
            )
            payload = {
                "ticker": ticker.upper(),
                "lang": lang,
                "model": config.model,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "data_as_of": context["data_as_of"],
                "cached": False,
                "config_fingerprint": fingerprint,
                "analysis": analysis.model_dump(),
            }
            self.cache.write(ticker, lang, payload)
            return payload
