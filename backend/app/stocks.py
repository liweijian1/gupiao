from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from importlib import import_module
from typing import Any

import pandas as pd

from .config import CACHE_DIR


STOCK_SNAPSHOT_PATH = CACHE_DIR / "stock_snapshot.json"
MAX_STOCK_CACHE_AGE = timedelta(minutes=20)
BAOSTOCK_LOOKBACK_DAYS = 180

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

    return {**snapshot, "stocks": [stock for stock in snapshot["stocks"] if matches(stock)][:limit]}


def stock_quote(symbol: str) -> dict[str, Any]:
    normalized = symbol.strip().lower()
    snapshot = get_stock_snapshot()
    for stock in snapshot["stocks"]:
        aliases = [alias.lower() for alias in stock.get("aliases") or []]
        if normalized in {stock["ticker"].lower(), *aliases}:
            return {"stock": stock, "source": snapshot["source"], "updated_at": snapshot["updated_at"]}
    if normalized.replace(".sh", "").replace(".sz", "").isdigit():
        try:
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
            return {"stock": None, "source": snapshot["source"], "updated_at": snapshot["updated_at"], "warning": f"symbol not found; baostock quote failed: {exc}"}
    return {"stock": None, "source": snapshot["source"], "updated_at": snapshot["updated_at"], "warning": "symbol not found"}
