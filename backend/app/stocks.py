from __future__ import annotations

import json
import os
from datetime import datetime, time, timedelta, timezone
from importlib import import_module
from threading import RLock
from typing import Any
from zoneinfo import ZoneInfo

import pandas as pd
import requests

from .config import CACHE_DIR


STOCK_SNAPSHOT_PATH = CACHE_DIR / "stock_snapshot.json"
MAX_STOCK_CACHE_AGE = timedelta(minutes=20)
BAOSTOCK_LOOKBACK_DAYS = 180
BAOSTOCK_LOCK = RLock()
REALTIME_QUOTE_TTL = timedelta(seconds=5)
REALTIME_QUOTE_LOCK = RLock()
REALTIME_QUOTE_CACHE: dict[str, dict[str, Any]] = {}
CHINA_TIMEZONE = ZoneInfo("Asia/Shanghai")


def add_no_proxy_host(host: str) -> None:
    for key in ("NO_PROXY", "no_proxy"):
        current = [item.strip() for item in os.environ.get(key, "").split(",") if item.strip()]
        if host not in current:
            current.append(host)
            os.environ[key] = ",".join(current)


add_no_proxy_host("push2.eastmoney.com")

FALLBACK_STOCKS = [
    {"ticker": "600519", "name": "Kweichow Moutai", "aliases": ["贵州茅台", "茅台", "600519.SH"], "exchange": "SSE", "currency": "¥", "sector": "Consumer", "price": 1468.6, "chg": 0.7, "score": 83, "pe": 23.4, "growth": 15.1, "rsi": 56, "beta": 0.6, "trend": 73, "liquidity": 88, "source": "fallback"},
    {"ticker": "300750", "name": "CATL", "aliases": ["宁德时代", "300750.SZ"], "exchange": "SZSE", "currency": "¥", "sector": "NewEnergy", "price": 258.2, "chg": 1.8, "score": 87, "pe": 24.9, "growth": 21.7, "rsi": 62, "beta": 1.4, "trend": 79, "liquidity": 91, "source": "fallback"},
    {"ticker": "002594", "name": "BYD", "aliases": ["比亚迪", "002594.SZ"], "exchange": "SZSE", "currency": "¥", "sector": "Auto", "price": 312.5, "chg": 1.2, "score": 84, "pe": 28.1, "growth": 18.4, "rsi": 59, "beta": 1.2, "trend": 77, "liquidity": 89, "source": "fallback"},
    {"ticker": "600036", "name": "China Merchants Bank", "aliases": ["招商银行", "招行", "600036.SH"], "exchange": "SSE", "currency": "¥", "sector": "Banks", "price": 41.2, "chg": -0.3, "score": 72, "pe": 7.3, "growth": 3.2, "rsi": 49, "beta": 0.8, "trend": 57, "liquidity": 92, "source": "fallback"},
    {"ticker": "601318", "name": "Ping An Insurance", "aliases": ["中国平安", "平安", "601318.SH"], "exchange": "SSE", "currency": "¥", "sector": "Insurance", "price": 52.8, "chg": 0.5, "score": 70, "pe": 8.6, "growth": 4.9, "rsi": 51, "beta": 0.9, "trend": 61, "liquidity": 90, "source": "fallback"},
    {"ticker": "000858", "name": "Wuliangye", "aliases": ["五粮液", "000858.SZ"], "exchange": "SZSE", "currency": "¥", "sector": "Consumer", "price": 128.4, "chg": -0.8, "score": 68, "pe": 18.9, "growth": 6.1, "rsi": 44, "beta": 0.7, "trend": 48, "liquidity": 84, "source": "fallback"},
    {"ticker": "600276", "name": "Hengrui Medicine", "aliases": ["恒瑞医药", "600276.SH"], "exchange": "SSE", "currency": "¥", "sector": "Healthcare", "price": 47.6, "chg": 2.1, "score": 76, "pe": 39.5, "growth": 12.7, "rsi": 64, "beta": 1.0, "trend": 69, "liquidity": 82, "source": "fallback"},
    {"ticker": "0700.HK", "name": "Tencent", "aliases": ["腾讯控股", "腾讯", "00700", "700.HK"], "exchange": "HKEX", "currency": "HK$", "sector": "Internet", "price": 418.0, "chg": 0.4, "score": 82, "pe": 19.7, "growth": 10.5, "rsi": 54, "beta": 1.1, "trend": 71, "liquidity": 94, "source": "fallback"},
    {"ticker": "9988.HK", "name": "Alibaba", "aliases": ["阿里巴巴", "阿里", "BABA"], "exchange": "HKEX", "currency": "HK$", "sector": "Internet", "price": 89.7, "chg": -0.6, "score": 73, "pe": 13.8, "growth": 5.8, "rsi": 46, "beta": 1.2, "trend": 55, "liquidity": 93, "source": "fallback"},
    {"ticker": "NVDA", "name": "NVIDIA", "aliases": ["英伟达"], "exchange": "NASDAQ", "currency": "$", "sector": "Semis", "price": 178.42, "chg": 2.8, "score": 92, "pe": 38.6, "growth": 31.2, "rsi": 63, "beta": 1.7, "trend": 88, "liquidity": 96, "source": "fallback"},
    {"ticker": "MSFT", "name": "Microsoft", "aliases": ["微软"], "exchange": "NASDAQ", "currency": "$", "sector": "Software", "price": 503.71, "chg": 0.9, "score": 88, "pe": 34.1, "growth": 14.5, "rsi": 58, "beta": 0.9, "trend": 81, "liquidity": 93, "source": "fallback"},
    {"ticker": "AAPL", "name": "Apple", "aliases": ["苹果"], "exchange": "NASDAQ", "currency": "$", "sector": "Hardware", "price": 214.15, "chg": -0.4, "score": 74, "pe": 29.3, "growth": 4.1, "rsi": 47, "beta": 1.1, "trend": 58, "liquidity": 95, "source": "fallback"},
    {"ticker": "AMD", "name": "AMD", "aliases": ["超威半导体"], "exchange": "NASDAQ", "currency": "$", "sector": "Semis", "price": 126.91, "chg": -2.2, "score": 69, "pe": 41.4, "growth": 12.4, "rsi": 38, "beta": 1.9, "trend": 44, "liquidity": 91, "source": "fallback"},
]

A_SHARE_SEED_CODES = [
    "600519", "300750", "002594", "600036", "601318", "000858", "600276",
    "601888", "600030", "600309", "600887", "600900", "601012", "601166",
    "000333", "000651", "000001", "000002", "002475", "002415", "300760",
    "300059", "300124", "600438", "603259", "688981", "688111", "688012",
]

A_SHARE_METADATA = {
    "600519": {"name": "贵州茅台", "sector": "Consumer", "aliases": ["茅台"]},
    "300750": {"name": "宁德时代", "sector": "NewEnergy"},
    "002594": {"name": "比亚迪", "sector": "Auto"},
    "600036": {"name": "招商银行", "sector": "Banks", "aliases": ["招行"]},
    "601318": {"name": "中国平安", "sector": "Insurance", "aliases": ["平安"]},
    "000858": {"name": "五粮液", "sector": "Consumer"},
    "600276": {"name": "恒瑞医药", "sector": "Healthcare"},
    "601888": {"name": "中国中免", "sector": "Consumer"},
    "600030": {"name": "中信证券", "sector": "Banks"},
    "600309": {"name": "万华化学", "sector": "Consumer"},
    "600887": {"name": "伊利股份", "sector": "Consumer"},
    "600900": {"name": "长江电力", "sector": "Energy"},
    "601012": {"name": "隆基绿能", "sector": "NewEnergy"},
    "601166": {"name": "兴业银行", "sector": "Banks"},
    "000333": {"name": "美的集团", "sector": "Consumer"},
    "000651": {"name": "格力电器", "sector": "Consumer"},
    "000001": {"name": "平安银行", "sector": "Banks"},
    "000002": {"name": "万科A", "sector": "Property"},
    "002475": {"name": "立讯精密", "sector": "Hardware"},
    "002415": {"name": "海康威视", "sector": "Hardware"},
    "300760": {"name": "迈瑞医疗", "sector": "Healthcare"},
    "300059": {"name": "东方财富", "sector": "Banks"},
    "300124": {"name": "汇川技术", "sector": "Hardware"},
    "600438": {"name": "通威股份", "sector": "NewEnergy"},
    "603259": {"name": "药明康德", "sector": "Healthcare"},
    "688981": {"name": "中芯国际", "sector": "Semis"},
    "688111": {"name": "金山办公", "sector": "Software"},
    "688012": {"name": "中微公司", "sector": "Semis"},
}


def clamp(value: float, lower: float = 0, upper: float = 100) -> float:
    return max(lower, min(upper, value))


def load_akshare() -> Any:
    return import_module("akshare")


def load_baostock() -> Any:
    return import_module("baostock")


def read_stock_cache() -> dict[str, Any] | None:
    if not STOCK_SNAPSHOT_PATH.exists():
        return None
    with STOCK_SNAPSHOT_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_stock_cache(snapshot: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with STOCK_SNAPSHOT_PATH.open("w", encoding="utf-8") as file:
        json.dump(snapshot, file, ensure_ascii=False, indent=2)


def cache_is_fresh(snapshot: dict[str, Any]) -> bool:
    updated_at = snapshot.get("updated_at")
    if not updated_at:
        return False
    updated = datetime.fromisoformat(updated_at)
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - updated < MAX_STOCK_CACHE_AGE


def first_present(row: pd.Series, names: list[str], default: Any = None) -> Any:
    for name in names:
        if name in row and pd.notna(row[name]) and row[name] != "-":
            return row[name]
    return default


def number(value: Any, default: float = 0) -> float:
    parsed = pd.to_numeric(value, errors="coerce")
    if pd.isna(parsed):
        return default
    return float(parsed)


def baostock_code(symbol: str) -> str:
    code = symbol.replace(".SH", "").replace(".SZ", "").replace("sh.", "").replace("sz.", "")
    return f"sh.{code}" if code.startswith(("5", "6", "9")) else f"sz.{code}"


def frontend_code(bs_code: str) -> str:
    return bs_code.split(".")[-1]


def infer_a_exchange(code: str) -> str:
    if code.startswith(("6", "9")):
        return "SSE"
    if code.startswith(("0", "2", "3")):
        return "SZSE"
    if code.startswith(("8", "4")):
        return "BSE"
    return "A-share"


def infer_us_exchange(code: str) -> str:
    if "." in code:
        return code.split(".")[-1].upper()
    return "US"


def infer_sector(name: str, market: str) -> str:
    text = name.lower()
    if any(token in text for token in ["银行", "bank"]):
        return "Banks"
    if any(token in text for token in ["保险", "insurance"]):
        return "Insurance"
    if any(token in text for token in ["药", "医", "medicine", "pharma", "health"]):
        return "Healthcare"
    if any(token in text for token in ["新能源", "电池", "solar", "energy"]):
        return "NewEnergy"
    if any(token in text for token in ["车", "auto", "tesla", "byd"]):
        return "Auto"
    if any(token in text for token in ["酒", "消费", "moutai", "wuliangye", "costco"]):
        return "Consumer"
    if any(token in text for token in ["软件", "microsoft", "software"]):
        return "Software"
    if any(token in text for token in ["芯", "半导体", "nvidia", "amd", "semiconductor"]):
        return "Semis"
    if any(token in text for token in ["腾讯", "阿里", "internet", "alibaba", "tencent"]):
        return "Internet"
    return {"a": "Consumer", "hk": "Internet", "us": "Software"}.get(market, "Consumer")


def fallback_stock(symbol: str) -> dict[str, Any] | None:
    normalized = symbol.replace(".SH", "").replace(".SZ", "").lower()
    for stock in FALLBACK_STOCKS:
        aliases = [alias.lower().replace(".sh", "").replace(".sz", "") for alias in stock.get("aliases") or []]
        if normalized in {stock["ticker"].lower(), *aliases}:
            return stock
    return None


def liquidity_score(turnover_rate: float, amount: float) -> int:
    amount_score = min(45, amount / 1_000_000_000 * 15) if amount > 0 else 18
    turnover_score = min(45, turnover_rate * 8) if turnover_rate > 0 else 18
    return round(clamp(20 + amount_score + turnover_score))


def normalize_baostock_history(history: pd.DataFrame, bs_code: str, name: str | None = None) -> dict[str, Any] | None:
    if history.empty:
        return None

    clean = history.copy()
    if "code" in clean.columns:
        clean = clean.loc[clean["code"] == bs_code].copy()
    if clean.empty:
        return None
    for column in ["close", "preclose", "turn", "pctChg", "peTTM", "amount"]:
        clean[column] = pd.to_numeric(clean[column], errors="coerce")
    clean = clean.dropna(subset=["close"])
    if clean.empty:
        return None

    latest = clean.iloc[-1]
    first = clean.iloc[0]
    code = frontend_code(bs_code)
    fallback = fallback_stock(code)
    metadata = A_SHARE_METADATA.get(code, {})
    display_name = metadata.get("name") or name or (fallback.get("aliases", [code])[0] if fallback else code)
    price = number(latest["close"])
    chg = number(latest.get("pctChg"))
    pe = number(latest.get("peTTM"))
    turn = number(latest.get("turn"))
    amount = number(latest.get("amount"))
    start_price = number(first["close"], price)
    growth = 0 if start_price == 0 else round((price / start_price - 1) * 100, 2)
    trend = round(clamp(50 + growth * 1.4))
    rsi = round(clamp(50 + chg * 3))
    liquidity = liquidity_score(turn, amount)
    valuation_score = 72 if pe <= 0 else clamp(88 - pe * 0.9)
    score = round(clamp(0.35 * trend + 0.25 * liquidity + 0.2 * valuation_score + 0.2 * rsi))

    aliases = [code, bs_code, f"{code}.SH" if bs_code.startswith("sh.") else f"{code}.SZ"]
    aliases.extend(metadata.get("aliases", []))
    if fallback:
        aliases.extend(fallback.get("aliases") or [])
        display_name = fallback["name"] if display_name == code else display_name

    return {
        "ticker": code,
        "name": display_name,
        "aliases": sorted(set(aliases)),
        "exchange": infer_a_exchange(code),
        "currency": "¥",
        "sector": metadata.get("sector") or (fallback["sector"] if fallback else infer_sector(display_name, "a")),
        "price": round(price, 2),
        "chg": round(chg, 2),
        "score": score,
        "pe": round(pe, 2),
        "growth": growth,
        "rsi": rsi,
        "beta": fallback.get("beta", 1.0) if fallback else 1.0,
        "trend": trend,
        "liquidity": liquidity,
        "source": "baostock",
        "latest_date": str(latest.get("date", "")),
    }


def fetch_baostock_stock(bs: Any, symbol: str) -> dict[str, Any] | None:
    bs_code = baostock_code(symbol)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=BAOSTOCK_LOOKBACK_DAYS)
    fields = "date,code,open,high,low,close,preclose,volume,amount,turn,pctChg,peTTM,pbMRQ,isST"
    result = bs.query_history_k_data_plus(
        bs_code,
        fields,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        frequency="d",
        adjustflag="3",
    )
    if result.error_code != "0":
        raise RuntimeError(f"{bs_code}: {result.error_msg}")

    rows = []
    while result.next():
        rows.append(result.get_row_data())
    history = pd.DataFrame(rows, columns=result.fields)

    name = None
    try:
        basic = bs.query_stock_basic(code=bs_code)
        if basic.error_code == "0":
            data = basic.get_data()
            if not data.empty and "code_name" in data:
                name = str(data.iloc[0]["code_name"])
    except Exception:
        name = None

    return normalize_baostock_history(history, bs_code, name)


def fetch_baostock_snapshot() -> tuple[list[dict[str, Any]], list[str]]:
    with BAOSTOCK_LOCK:
        bs = load_baostock()
        errors: list[str] = []
        collected: list[dict[str, Any]] = []
        login = bs.login()
        if login.error_code != "0":
            raise RuntimeError(f"baostock login failed: {login.error_msg}")

        try:
            for code in A_SHARE_SEED_CODES:
                try:
                    stock = fetch_baostock_stock(bs, code)
                    if stock:
                        collected.append(stock)
                except Exception as exc:  # noqa: BLE001 - one bad symbol should not fail the source.
                    errors.append(f"baostock {code}: {exc}")
        finally:
            bs.logout()

    return collected, errors


def normalize_spot_frame(df: pd.DataFrame, market: str) -> list[dict[str, Any]]:
    stocks: list[dict[str, Any]] = []
    for _, row in df.head(500).iterrows():
        code = str(first_present(row, ["代码", "code", "symbol", "序号"], "")).strip()
        name = str(first_present(row, ["名称", "name", "中文名称", "简称"], code)).strip()
        if not code or code == "nan":
            continue

        price = number(first_present(row, ["最新价", "最新", "现价", "收盘", "price"]), 0)
        chg = number(first_present(row, ["涨跌幅", "涨幅", "changepercent", "涨跌比例"]), 0)
        pe = number(first_present(row, ["市盈率-动态", "市盈率", "PE", "pe"]), 0)
        turnover = number(first_present(row, ["换手率", "turnover"]), 0)
        amount = number(first_present(row, ["成交额", "amount"]), 0)
        ytd = number(first_present(row, ["年初至今涨跌幅", "年初至今", "YTD"]), chg)
        sixty_day = number(first_present(row, ["60日涨跌幅", "60日涨幅"]), ytd)

        trend = round(clamp(50 + ytd * 1.4))
        growth = round(sixty_day, 2)
        rsi = round(clamp(50 + chg * 3))
        liquidity = liquidity_score(turnover, amount)
        valuation_score = 72 if pe <= 0 else clamp(88 - pe * 0.9)
        score = round(clamp(0.35 * trend + 0.25 * liquidity + 0.2 * valuation_score + 0.2 * rsi))

        if market == "a":
            ticker = code
            exchange = infer_a_exchange(code)
            currency = "¥"
        elif market == "hk":
            ticker = code if code.endswith(".HK") else f"{code}.HK"
            exchange = "HKEX"
            currency = "HK$"
        else:
            ticker = code.upper()
            exchange = infer_us_exchange(ticker)
            currency = "$"

        stocks.append({
            "ticker": ticker,
            "name": name,
            "aliases": [code, name],
            "exchange": exchange,
            "currency": currency,
            "sector": infer_sector(name, market),
            "price": round(price, 2),
            "chg": round(chg, 2),
            "score": score,
            "pe": round(pe, 2),
            "growth": growth,
            "rsi": rsi,
            "beta": 1.0,
            "trend": trend,
            "liquidity": liquidity,
            "source": "akshare",
        })
    return stocks


def fetch_stock_snapshot() -> dict[str, Any]:
    errors: list[str] = []
    collected: list[dict[str, Any]] = []

    try:
        baostock_stocks, baostock_errors = fetch_baostock_snapshot()
        collected.extend(baostock_stocks)
        errors.extend(baostock_errors)
    except Exception as exc:  # noqa: BLE001 - AkShare remains an optional fallback.
        errors.append(f"baostock: {exc}")

    if not collected:
        ak = load_akshare()
        for fn_name, market in [
            ("stock_zh_a_spot_em", "a"),
            ("stock_hk_spot_em", "hk"),
            ("stock_us_spot_em", "us"),
        ]:
            try:
                df = getattr(ak, fn_name)()
                collected.extend(normalize_spot_frame(df, market))
            except Exception as exc:  # noqa: BLE001 - keep partial market data.
                errors.append(f"{fn_name}: {exc}")

    if not collected:
        raise RuntimeError("; ".join(errors) or "no stock data returned")

    deduped = list({stock["ticker"]: stock for stock in collected}.values())
    snapshot = {
        "stocks": deduped,
        "source": "baostock" if any(stock.get("source") == "baostock" for stock in deduped) else "akshare",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "errors": errors,
    }
    write_stock_cache(snapshot)
    return snapshot


def fallback_snapshot(warning: str | None = None) -> dict[str, Any]:
    return {
        "stocks": FALLBACK_STOCKS,
        "source": "fallback",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "warning": warning,
    }


def get_stock_snapshot(force_refresh: bool = False) -> dict[str, Any]:
    if not force_refresh:
        cached = read_stock_cache()
        if cached and cache_is_fresh(cached):
            return cached

    try:
        return fetch_stock_snapshot()
    except Exception as exc:  # noqa: BLE001 - frontend should remain usable.
        cached = read_stock_cache()
        if cached:
            cached["warning"] = f"refresh failed, returning cached stock snapshot: {exc}"
            return cached
        snapshot = fallback_snapshot(f"refresh failed, returning fallback stocks: {exc}")
        write_stock_cache(snapshot)
        return snapshot


def fetch_akshare_realtime_values(symbol: str) -> dict[str, Any]:
    ak = load_akshare()
    frame = ak.stock_bid_ask_em(symbol=symbol)
    values = {
        str(row["item"]): row["value"]
        for _, row in frame.iterrows()
        if "item" in row and "value" in row
    }
    price = number(values.get("最新"))
    if price <= 0:
        raise RuntimeError("AKShare returned no valid latest price")
    return {
        "price": price,
        "chg": number(values.get("涨幅")),
        "open": number(values.get("今开")),
        "high": number(values.get("最高")),
        "low": number(values.get("最低")),
        "previous_close": number(values.get("昨收")),
        "average_price": number(values.get("均价")),
        "volume": number(values.get("总手")) * 100,
        "amount": number(values.get("金额")),
        "turnover": number(values.get("换手")),
        "buy_1": number(values.get("buy_1")),
        "sell_1": number(values.get("sell_1")),
        "market_date": None,
        "market_time": None,
        "provider": "eastmoney",
    }


def fetch_sina_realtime_values(symbol: str) -> dict[str, Any]:
    prefix = "sh" if symbol.startswith(("5", "6", "9")) else "bj" if symbol.startswith(("4", "8")) else "sz"
    session = requests.Session()
    session.trust_env = False
    response = session.get(
        f"https://hq.sinajs.cn/list={prefix}{symbol}",
        headers={"Referer": "https://finance.sina.com.cn/"},
        timeout=8,
    )
    response.raise_for_status()
    response.encoding = "gbk"
    payload = response.text.split('="', 1)[-1].rsplit('"', 1)[0]
    fields = payload.split(",")
    if len(fields) < 32:
        raise RuntimeError("Sina returned an incomplete realtime quote")
    price = number(fields[3])
    previous_close = number(fields[2])
    if price <= 0:
        raise RuntimeError("Sina returned no valid latest price")
    chg = 0 if previous_close <= 0 else (price / previous_close - 1) * 100
    volume = number(fields[8])
    amount = number(fields[9])
    return {
        "price": price,
        "chg": chg,
        "open": number(fields[1]),
        "high": number(fields[4]),
        "low": number(fields[5]),
        "previous_close": previous_close,
        "average_price": amount / volume if volume > 0 else price,
        "volume": volume,
        "amount": amount,
        "turnover": 0,
        "buy_1": number(fields[6]),
        "sell_1": number(fields[7]),
        "market_date": fields[30],
        "market_time": fields[31],
        "provider": "sina",
    }


def is_china_market_open(at: datetime | None = None) -> bool:
    china_now = (at or datetime.now(timezone.utc)).astimezone(CHINA_TIMEZONE)
    return china_now.weekday() < 5 and time(9, 0) <= china_now.time() < time(15, 0)


def stock_cached_quote(symbol: str, now: datetime) -> dict[str, Any]:
    realtime_cached = REALTIME_QUOTE_CACHE.get(symbol)
    if realtime_cached and realtime_cached.get("quote"):
        quote = {**realtime_cached["quote"], "source": "stock-cache"}
        return {
            "quote": quote,
            "source": "stock-cache",
            "updated_at": realtime_cached["updated_at"],
            "market_open": False,
            "market_status": "closed",
            "refresh_after_seconds": 60,
        }

    snapshot = read_stock_cache()
    if snapshot:
        stock = next((item for item in snapshot.get("stocks", []) if item.get("ticker") == symbol), None)
        if stock:
            quote = {
                "ticker": symbol,
                "price": stock.get("price", 0),
                "chg": stock.get("chg", 0),
                "market_date": stock.get("latest_date"),
                "market_time": None,
                "provider": stock.get("source", snapshot.get("source", "cache")),
                "source": "stock-cache",
            }
            return {
                "quote": quote,
                "source": "stock-cache",
                "updated_at": snapshot.get("updated_at", now.isoformat()),
                "market_open": False,
                "market_status": "closed",
                "refresh_after_seconds": 60,
            }

    return {
        "quote": None,
        "source": "stock-cache",
        "updated_at": now.isoformat(),
        "market_open": False,
        "market_status": "closed",
        "refresh_after_seconds": 60,
        "warning": "No cached quote is available for this symbol",
    }


def stock_realtime_quote(symbol: str, force_refresh: bool = False) -> dict[str, Any]:
    compact_symbol = symbol.strip().lower().replace(".sh", "").replace(".sz", "").replace("sh.", "").replace("sz.", "")
    now = datetime.now(timezone.utc)
    if len(compact_symbol) != 6 or not compact_symbol.isdigit():
        return {
            "quote": None,
            "source": "akshare-realtime",
            "updated_at": now.isoformat(),
            "warning": "A-share symbol must be a 6-digit code",
        }

    with REALTIME_QUOTE_LOCK:
        if not is_china_market_open(now):
            return stock_cached_quote(compact_symbol, now)

        cached = REALTIME_QUOTE_CACHE.get(compact_symbol)
        if cached and not force_refresh:
            cached_at = datetime.fromisoformat(cached["updated_at"])
            if now - cached_at < REALTIME_QUOTE_TTL:
                return cached

        try:
            provider_warning = None
            try:
                values = fetch_akshare_realtime_values(compact_symbol)
            except Exception as akshare_exc:  # noqa: BLE001 - Sina is an AKShare-supported realtime fallback.
                values = fetch_sina_realtime_values(compact_symbol)
                provider_warning = f"Eastmoney unavailable; using Sina realtime source: {akshare_exc}"

            quote = {
                "ticker": compact_symbol,
                "price": round(values["price"], 2),
                "chg": round(values["chg"], 2),
                "open": round(values["open"], 2),
                "high": round(values["high"], 2),
                "low": round(values["low"], 2),
                "previous_close": round(values["previous_close"], 2),
                "average_price": round(values["average_price"], 2),
                "volume": round(values["volume"]),
                "amount": round(values["amount"], 2),
                "turnover": round(values["turnover"], 2),
                "buy_1": round(values["buy_1"], 2),
                "sell_1": round(values["sell_1"], 2),
                "market_date": values["market_date"],
                "market_time": values["market_time"],
                "provider": values["provider"],
                "source": "akshare-realtime",
            }
            result = {
                "quote": quote,
                "source": "akshare-realtime",
                "updated_at": now.isoformat(),
                "cache_ttl_seconds": int(REALTIME_QUOTE_TTL.total_seconds()),
                "market_open": True,
                "market_status": "open",
                "refresh_after_seconds": int(REALTIME_QUOTE_TTL.total_seconds()),
            }
            if provider_warning:
                result["notice"] = provider_warning
            REALTIME_QUOTE_CACHE[compact_symbol] = result
            return result
        except Exception as exc:  # noqa: BLE001 - preserve the last good quote during source outages.
            if cached:
                return {
                    **cached,
                    "stale": True,
                    "warning": f"AKShare realtime refresh failed; returning last quote: {exc}",
                }
            return {
                "quote": None,
                "source": "akshare-realtime",
                "updated_at": now.isoformat(),
                "warning": f"AKShare realtime quote failed: {exc}",
            }


def stock_search(query: str = "", limit: int = 50) -> dict[str, Any]:
    snapshot = get_stock_snapshot()
    normalized = query.strip().lower()
    if not normalized:
        return {**snapshot, "stocks": snapshot["stocks"][:limit]}

    def matches(stock: dict[str, Any]) -> bool:
        haystack = " ".join(str(value) for value in [
            stock.get("ticker"),
            stock.get("name"),
            stock.get("exchange"),
            stock.get("sector"),
            " ".join(stock.get("aliases") or []),
        ]).lower()
        return normalized in haystack

    compact_symbol = normalized.replace(".sh", "").replace(".sz", "").replace("sh.", "").replace("sz.", "")
    if len(compact_symbol) == 6 and compact_symbol.isdigit():
        quote = stock_quote(compact_symbol)
        if quote.get("stock"):
            return {
                "stocks": [quote["stock"]],
                "source": quote["source"],
                "updated_at": quote["updated_at"],
                "query": query,
            }

    local_matches = [stock for stock in snapshot["stocks"] if matches(stock)][:limit]
    if local_matches:
        return {**snapshot, "stocks": local_matches, "query": query}

    for _ in range(2):
        try:
            with BAOSTOCK_LOCK:
                bs = load_baostock()
                login = bs.login()
                if login.error_code != "0":
                    raise RuntimeError(login.error_msg)
                try:
                    basic = bs.query_stock_basic(code_name=query.strip())
                    if basic.error_code == "0":
                        candidates = basic.get_data()
                        named_matches = []
                        if "code" in candidates.columns:
                            for _, candidate in candidates.head(limit).iterrows():
                                stock = fetch_baostock_stock(bs, str(candidate["code"]))
                                if stock:
                                    named_matches.append(stock)
                        if named_matches:
                            return {
                                "stocks": named_matches,
                                "source": "baostock",
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                                "query": query,
                            }
                finally:
                    bs.logout()
        except Exception:
            continue

    try:
        ak = load_akshare()
        frame = ak.stock_zh_a_spot_em()
        code_column = next((column for column in ["代码", "code", "symbol"] if column in frame.columns), None)
        name_column = next((column for column in ["名称", "name", "简称"] if column in frame.columns), None)
        if code_column or name_column:
            mask = pd.Series(False, index=frame.index)
            if code_column:
                mask |= frame[code_column].astype(str).str.lower().str.contains(normalized, regex=False)
            if name_column:
                mask |= frame[name_column].astype(str).str.lower().str.contains(normalized, regex=False)
            remote_matches = normalize_spot_frame(frame.loc[mask].head(limit), "a")
            if remote_matches:
                return {
                    "stocks": remote_matches,
                    "source": "akshare",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "query": query,
                }
    except Exception as exc:  # noqa: BLE001 - report a usable search miss to the client.
        return {
            **snapshot,
            "stocks": [],
            "query": query,
            "warning": f"remote A-share search failed: {exc}",
        }

    return {**snapshot, "stocks": [], "query": query, "warning": "symbol or company name not found"}


def stock_quote(symbol: str) -> dict[str, Any]:
    normalized = symbol.strip().lower()
    snapshot = get_stock_snapshot()
    compact_symbol = normalized.replace(".sh", "").replace(".sz", "").replace("sh.", "").replace("sz.", "")
    live_warning = None
    if len(compact_symbol) == 6 and compact_symbol.isdigit():
        try:
            with BAOSTOCK_LOCK:
                bs = load_baostock()
                login = bs.login()
                if login.error_code != "0":
                    raise RuntimeError(login.error_msg)
                try:
                    stock = fetch_baostock_stock(bs, normalized)
                finally:
                    bs.logout()
            if stock:
                return {"stock": stock, "source": "baostock", "updated_at": datetime.now(timezone.utc).isoformat()}
        except Exception as exc:  # noqa: BLE001 - return a structured miss below.
            live_warning = f"live baostock quote failed: {exc}"

    for stock in snapshot["stocks"]:
        aliases = [alias.lower() for alias in stock.get("aliases") or []]
        if normalized in {stock["ticker"].lower(), *aliases} or compact_symbol == stock["ticker"].lower():
            result = {"stock": stock, "source": snapshot["source"], "updated_at": snapshot["updated_at"]}
            if live_warning:
                result["warning"] = f"{live_warning}; returning cached quote"
            return result
    return {"stock": None, "source": snapshot["source"], "updated_at": snapshot["updated_at"], "warning": live_warning or "symbol not found"}
