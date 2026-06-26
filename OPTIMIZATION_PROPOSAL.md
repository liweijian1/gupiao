# stock-macro-terminal 优化方案

参考项目：[ZhuLinsen/daily_stock_analysis](https://github.com/ZhuLinsen/daily_stock_analysis)

## 1. 背景

当前 `stock-macro-terminal` 已经具备：

- A 股搜索与股票排行展示
- Baostock 日线快照缓存
- AkShare / 新浪实时行情尝试
- 非交易时段使用缓存数据
- 前端实时轮询与数据源标识

但当前后端行情逻辑主要集中在 `backend/app/stocks.py`，数据源、缓存、降级、搜索、实时行情混在一起。随着后续加入更多股票源、基本面、新闻、资金流、AI 分析，这个文件会迅速变得难维护。

参考项目 `daily_stock_analysis` 的核心优势不是某一个接口，而是它有一层比较完整的数据源治理能力：

- 多数据源统一调度
- 统一行情数据结构
- 自动 fallback
- 熔断 / 冷却机制
- 分层缓存
- 数据源诊断与运行记录

因此，`stock-macro-terminal` 的下一步优化重点应放在“行情数据可靠性层”，而不是先继续堆 UI。

## 2. 优化目标

### 2.1 短期目标

- A 股搜索稳定命中具体股票。
- 实时行情在交易时段尽量实时。
- 东财 / AkShare 不稳定时自动切换新浪、腾讯。
- 早上 9 点前、下午 3 点后明确使用缓存数据。
- 前端能清楚显示：实时数据、缓存数据、数据来源、行情时间。

### 2.2 中期目标

- 后端数据源模块化。
- 增加 provider 健康状态。
- 支持更完整的 A 股实时字段：成交量、成交额、换手率、今开、最高、最低、昨收。
- 缓存最近一次实时行情，作为收盘后展示数据。

### 2.3 长期目标

- 支持港股、美股、ETF 更完整数据。
- 接入新闻、资金流、基本面、板块、AI 分析。
- 形成类似 `daily_stock_analysis` 的“分析工作台”，但保留当前项目的实时终端风格。

## 3. 当前问题

### 3.1 数据源耦合过重

当前主要逻辑集中在：

- `backend/app/stocks.py`
- `backend/app/akshare_client.py`

其中 `stocks.py` 同时承担：

- 股票快照生成
- Baostock 拉取
- AkShare 拉取
- 新浪实时拉取
- 搜索
- 缓存读写
- 交易时间判断
- 前端接口返回结构组装

问题是：后续每加一个源，都要继续改这个文件，风险会越来越高。

### 3.2 实时数据链路还不够完整

当前实时链路大致是：

```text
AkShare / Eastmoney
  ↓ 失败
Sina
  ↓ 失败
内存缓存 / stock_snapshot.json
```

建议补全为：

```text
AkShare Eastmoney
  ↓ 失败
Sina 单股实时
  ↓ 失败
Tencent 单股实时
  ↓ 失败
最近一次实时行情落盘缓存
  ↓ 失败
Baostock / stock_snapshot.json
  ↓ 失败
fallback 示例数据
```

### 3.3 缓存层级不够清晰

当前股票缓存主要是：

```text
backend/data/cache/stock_snapshot.json
```

它更适合做“股票列表 / 日线快照”，不适合承担“最近一次实时行情”的职责。

建议新增：

```text
backend/data/cache/realtime_quotes.json
```

用于保存交易时段内成功拿到的最近实时行情。

### 3.4 前端难以解释数据状态

用户看到“查不到”“缓存”“realtime”时，仍然不容易判断：

- 是不是实时？
- 是哪个 provider？
- 是不是已经过期？
- 为什么用了缓存？
- 上一次行情时间是什么时候？

后端应返回更清晰的 metadata。

## 4. 建议架构

### 4.1 新目录结构

建议新增：

```text
backend/app/market_data/
  __init__.py
  types.py
  manager.py
  cache.py
  market_time.py
  providers/
    __init__.py
    base.py
    akshare_provider.py
    sina_provider.py
    tencent_provider.py
    baostock_provider.py
```

职责说明：

| 文件 | 职责 |
|---|---|
| `types.py` | 定义统一行情结构、数据源枚举、返回状态 |
| `manager.py` | 数据源调度、fallback、熔断 |
| `cache.py` | 读写股票快照、实时行情缓存 |
| `market_time.py` | 判断交易时段、午休、收盘、周末 |
| `providers/base.py` | Provider 抽象基类 |
| `providers/akshare_provider.py` | AkShare / 东财行情 |
| `providers/sina_provider.py` | 新浪单股实时 |
| `providers/tencent_provider.py` | 腾讯单股实时 |
| `providers/baostock_provider.py` | Baostock 日线 / 名称查询 |

### 4.2 统一行情结构

参考 `daily_stock_analysis` 的 `UnifiedRealtimeQuote`，建议定义：

```python
from dataclasses import dataclass
from typing import Any


@dataclass
class UnifiedQuote:
    ticker: str
    name: str | None = None
    price: float | None = None
    chg: float | None = None
    change_amount: float | None = None

    open: float | None = None
    high: float | None = None
    low: float | None = None
    previous_close: float | None = None

    volume: float | None = None
    amount: float | None = None
    turnover: float | None = None

    provider: str = "unknown"
    source: str = "unknown"
    market_date: str | None = None
    market_time: str | None = None

    fetched_at: str | None = None
    provider_timestamp: str | None = None
    is_stale: bool | None = None
    stale_seconds: int | None = None
    fallback_from: str | None = None
    raw: dict[str, Any] | None = None
```

所有 provider 都返回这个结构。前端只消费统一字段。

### 4.3 Provider 抽象

```python
class QuoteProvider:
    name = "base"
    priority = 99

    def is_available(self) -> bool:
        return True

    def get_realtime_quote(self, symbol: str) -> UnifiedQuote | None:
        raise NotImplementedError
```

每个数据源只负责一件事：把自己的原始字段转成 `UnifiedQuote`。

## 5. 实时行情策略

### 5.1 推荐优先级

```python
REALTIME_PROVIDER_PRIORITY = [
    "akshare_em",
    "sina",
    "tencent",
    "realtime_cache",
    "baostock_snapshot",
]
```

### 5.2 交易时段策略

建议把 A 股交易时间拆细：

```text
09:00 前：使用缓存
09:00 - 09:30：可尝试实时，但标记 pre_market
09:30 - 11:30：实时
11:30 - 13:00：午休，可使用最近实时缓存
13:00 - 15:00：实时
15:00 后：使用最近实时缓存
周末 / 节假日：使用缓存
```

当前用户已确认的规则：

```text
早上 9 点前，下午 3 点后，拿股票缓存数据
```

所以第一阶段可以先保持：

```python
market_open = weekday and time(9, 0) <= now < time(15, 0)
```

第二阶段再细化午休、集合竞价、节假日。

### 5.3 返回结构建议

`GET /api/stocks/realtime?symbol=600519`

建议返回：

```json
{
  "quote": {
    "ticker": "600519",
    "name": "贵州茅台",
    "price": 1215.0,
    "chg": 0.42,
    "open": 1210.0,
    "high": 1220.0,
    "low": 1208.0,
    "previous_close": 1210.0,
    "volume": 12345678,
    "amount": 1234567890,
    "provider": "sina",
    "source": "realtime",
    "market_date": "2026-06-26",
    "market_time": "14:58:03"
  },
  "market_open": true,
  "market_status": "open",
  "source": "realtime",
  "updated_at": "2026-06-26T06:58:05Z",
  "refresh_after_seconds": 5,
  "source_chain": [
    {
      "provider": "akshare_em",
      "result": "failed",
      "duration_ms": 1200,
      "error": "RemoteDisconnected"
    },
    {
      "provider": "sina",
      "result": "ok",
      "duration_ms": 180
    }
  ]
}
```

这样前端可以准确解释：为什么用了新浪，为什么不是东财。

## 6. 熔断机制

参考项目中有 `CircuitBreaker`，建议简化实现：

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=3, cooldown_seconds=300):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.state = {}

    def is_available(self, provider: str) -> bool:
        ...

    def record_success(self, provider: str) -> None:
        ...

    def record_failure(self, provider: str, error: str) -> None:
        ...
```

规则：

- 连续失败 3 次，进入 cooldown。
- cooldown 默认 300 秒。
- cooldown 期间跳过该 provider。
- 成功后清空失败次数。

优势：

- 东财不稳定时不会每次都先卡住。
- 前端响应更快。
- 日志更清晰。

## 7. 缓存策略

### 7.1 推荐缓存文件

```text
backend/data/cache/
  stock_snapshot.json
  realtime_quotes.json
  stock_names.json
  provider_health.json
```

| 文件 | 用途 |
|---|---|
| `stock_snapshot.json` | 股票列表、排行榜、Baostock 日线快照 |
| `realtime_quotes.json` | 最近一次成功实时行情 |
| `stock_names.json` | 股票代码、名称、别名、拼音缓存 |
| `provider_health.json` | 数据源健康状态，可选 |

### 7.2 缓存读取顺序

交易时段内：

```text
内存 5 秒缓存
  ↓ 过期
provider 实时请求
  ↓ 成功
写入内存 + realtime_quotes.json
  ↓ 失败
读取最近 realtime_quotes.json
  ↓ 失败
读取 stock_snapshot.json
```

非交易时段：

```text
realtime_quotes.json
  ↓ 没有
stock_snapshot.json
  ↓ 没有
fallback 示例数据
```

这样下午 3 点后能优先显示收盘附近实时价，而不是 Baostock 可能延迟的日线数据。

## 8. 搜索优化

### 8.1 当前问题

用户搜索“东吴证券”时，若当前 snapshot 没有该股票，就需要远程查询。如果远程源不稳定，就会出现查不到。

### 8.2 建议方案

新增 `stock_names.json`：

```json
{
  "601555": {
    "name": "东吴证券",
    "aliases": ["东吴", "东吴证券", "601555.SH", "sh.601555"],
    "exchange": "SSE"
  }
}
```

搜索流程：

```text
本地 stock_names.json
  ↓ 未命中
stock_snapshot.json
  ↓ 未命中
Baostock code_name 查询
  ↓ 未命中
AkShare 全量行情查询
  ↓ 未命中
返回空结果 + 明确 warning
```

命中远程结果后写入 `stock_names.json`。

## 9. 前端展示优化

### 9.1 数据源标签

当前标签可以继续显示：

```text
akshare · realtime · 14:58:03
cache · market closed · 2026-06-26
```

建议进一步细化：

```text
sina · realtime · 14:58:03
tencent · realtime · 14:58:03
cache · after close · 14:59:58
baostock · daily · 2026-06-26
```

### 9.2 异常提示

如果实时源失败但返回缓存，前端可以显示轻提示：

```text
实时源暂不可用，已显示最近缓存行情
```

不要只显示空表。

### 9.3 Provider 诊断入口

可增加一个小状态按钮：

```text
数据源：sina ✓
```

点击展开：

```text
akshare_em failed 1200ms
sina ok 180ms
tencent skipped
```

## 10. API 建议

### 10.1 实时行情

```http
GET /api/stocks/realtime?symbol=600519&force=false
```

### 10.2 股票搜索

```http
GET /api/stocks/search?q=东吴证券&limit=20
```

### 10.3 Provider 健康状态

新增：

```http
GET /api/stocks/providers/health
```

返回：

```json
{
  "providers": [
    {
      "name": "akshare_em",
      "status": "cooldown",
      "failures": 3,
      "last_error": "RemoteDisconnected",
      "cooldown_until": "2026-06-26T07:05:00Z"
    },
    {
      "name": "sina",
      "status": "ok",
      "failures": 0,
      "last_success": "2026-06-26T06:58:05Z"
    }
  ]
}
```

### 10.4 缓存状态

新增：

```http
GET /api/stocks/cache/status
```

返回：

```json
{
  "stock_snapshot": {
    "exists": true,
    "updated_at": "2026-06-26T06:00:00Z",
    "count": 28
  },
  "realtime_quotes": {
    "exists": true,
    "updated_at": "2026-06-26T06:59:58Z",
    "count": 12
  }
}
```

## 11. 实施计划

### 阶段 1：低风险重构

目标：不改变前端体验，只重构后端结构。

- 新增 `market_data/types.py`
- 新增 `market_data/cache.py`
- 新增 `market_data/market_time.py`
- 把当前实时行情返回转为 `UnifiedQuote`
- 保持 `/api/stocks/realtime` 返回兼容

验收：

- 前端原有页面正常。
- 搜索股票正常。
- 实时行情接口正常。
- 非交易时段仍返回缓存。

### 阶段 2：Provider Manager

目标：建立数据源 fallback 链。

- 新增 `providers/base.py`
- 新增 `akshare_provider.py`
- 新增 `sina_provider.py`
- 新增 `tencent_provider.py`
- 新增 `manager.py`
- 返回 `source_chain`

验收：

- AkShare 失败时自动切新浪。
- 新浪失败时自动切腾讯。
- 全部失败时返回缓存。
- 前端能显示实际 provider。

### 阶段 3：熔断与健康状态

目标：避免坏源持续拖慢系统。

- 新增 `CircuitBreaker`
- 新增 `/api/stocks/providers/health`
- provider 失败计数、cooldown
- 日志输出 provider 结果

验收：

- 某源连续失败后短时间跳过。
- 健康接口可查看状态。

### 阶段 4：实时行情落盘缓存

目标：收盘后优先显示最后一次实时行情。

- 新增 `realtime_quotes.json`
- 实时请求成功后落盘
- 非交易时段优先读取该文件

验收：

- 9 点前读取缓存。
- 15 点后读取缓存。
- 缓存标识清楚显示。

### 阶段 5：搜索缓存

目标：具体股票名称搜索更稳定。

- 新增 `stock_names.json`
- 远程搜索命中后写缓存
- 本地优先命中代码 / 名称 / 别名

验收：

- 搜索 `东吴证券` 命中 `601555`
- 搜索 `601555` 命中 `东吴证券`
- 远程源失败时仍能命中历史查过的股票

## 12. 优先级建议

推荐先做：

1. `UnifiedQuote`
2. Provider Manager
3. Tencent fallback
4. `realtime_quotes.json`
5. Provider health API

暂时不建议先做：

- AI 报告
- 新闻舆情
- 复杂基本面
- GitHub Actions 自动推送
- 多市场全量支持

原因是当前最影响用户体验的是“数据是否能拿到、是否可信、为什么用了缓存”。先把行情链路打稳，后面的分析能力才有地基。

## 13. 最小可行改造范围

如果希望快速落地，可以只做以下最小版本：

```text
backend/app/market_data/
  types.py
  manager.py
  providers/
    akshare_provider.py
    sina_provider.py
    tencent_provider.py
```

并保持现有：

```text
backend/app/stocks.py
```

作为兼容层。

也就是说：

```text
前端
  ↓
/api/stocks/realtime
  ↓
stocks.py
  ↓
market_data.manager.get_realtime_quote()
  ↓
akshare → sina → tencent → cache
```

这样风险最低，也方便逐步迁移。

## 14. 参考项目中值得借鉴的点

| 参考项目能力 | 是否建议迁移 | 原因 |
|---|---:|---|
| `UnifiedRealtimeQuote` | 是 | 统一不同源字段，降低前端复杂度 |
| `CircuitBreaker` | 是 | 防止坏源拖慢系统 |
| 多数据源 Manager | 是 | 当前项目正需要 |
| provider 运行记录 | 是 | 方便定位“为什么没数据” |
| AI 报告 | 暂缓 | 当前阶段先稳行情 |
| 多渠道推送 | 暂缓 | 与当前终端产品方向不完全一致 |
| GitHub Actions 定时任务 | 暂缓 | 后面做日报时再引入 |
| 新闻 / 舆情 / 基本面 | 后续 | 等行情稳定后再做 |

## 15. 总结

`daily_stock_analysis` 的代码量很大，不建议整套搬进 `stock-macro-terminal`。更好的方式是吸收它的数据源治理思想：

```text
统一结构
  ↓
多源 fallback
  ↓
熔断冷却
  ↓
分层缓存
  ↓
可解释的数据状态
```

这会让当前项目从“能查股票的界面”升级成“稳定、可解释、可继续扩展的行情终端”。

