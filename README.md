# Stock Macro Terminal

中国宏观数据与股票量化筛选终端。前端为 React 仪表盘，后端通过 AkShare / Baostock 拉取数据，提供宏观指标评分、股票快照与搜索 API。

## 功能

- **宏观实验室**：PMI、M1/M2、社融、CPI/PPI 等 13 项中国宏观序列，归一化后计算综合评分
- **量化筛选**：多因子打分、排序、搜索，支持 A 股 / 港股 / 美股示例池
- **数据管道**：本地缓存快照，支持手动刷新；AkShare 不可用时自动降级为 mock 数据
- **AI 股票分析**：使用当前股票、量化因子和宏观快照生成结构化研究摘要、评级与建议仓位，并按股票和语言缓存最近结果
- **安全 AI 配置**：支持 OpenAI 兼容的 Base URL、模型与 API Key；配置管理和分析访问使用两套独立密码
- **双语界面**：中英文切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、Vite 6、Lucide Icons |
| 后端 | FastAPI、Uvicorn、Pandas、NumPy |
| 数据源 | AkShare（宏观）、Baostock（股票） |

## 项目结构

```
stock-macro-terminal/
├── backend/          # FastAPI 服务
│   ├── app/
│   │   ├── main.py       # API 路由
│   │   ├── service.py    # 宏观数据抓取与缓存
│   │   ├── stocks.py     # 股票数据
│   │   ├── indicators.py # 宏观指标定义
│   │   └── scoring.py    # 评分逻辑
│   └── requirements.txt
└── frontend/         # Vite + React 前端
    └── src/
        └── App.jsx
```

## 快速开始

### 环境要求

- Python 3.14（常规本地开发）或 Python 3.11（启用 Qlib 日频研究）
- Node.js 18+

### 1. 启动后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-akshare.txt   # 可选，用于真实宏观数据
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

未安装 AkShare 时 API 仍可运行，返回 `source: "mock"` 的降级数据。

Qlib 研究数据集、因子排名与回测仅支持 A 股前复权日线，且生产服务必须使用 CPython 3.11。设置 `RESEARCH_DATA_DIR` 到 release 目录外的可持久化位置；首次使用需调用研究数据刷新接口。详细的生产预检与恢复步骤见 [Qlib 研究运行说明](docs/operations/qlib-research.md)。

如需启用 AI 设置与分析接口，启动后端前配置两套不同用途的密码：

```bash
export AI_ADMIN_PASSWORD='<administrator configuration password>'
export AI_ANALYSIS_PASSWORD='<separate analysis access password>'
export AI_CONFIG_PATH='./data/cache/ai_config.json'
export AI_ANALYSIS_CACHE_DIR='./data/cache/ai_analysis'
```

`AI_ADMIN_PASSWORD` 只用于测试和保存 AI 服务配置，`AI_ANALYSIS_PASSWORD` 只用于读取或生成股票分析。任一密码为空时对应接口都会拒绝访问。API Key 由后端以 `0600` 权限写入 `AI_CONFIG_PATH`，不会写入 Git、浏览器存储或前端静态资源。

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 http://127.0.0.1:5173

如需指定后端地址：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

### 3. 生产构建

```bash
cd frontend
npm run build
npm run preview
```

## API 接口

### 宏观数据

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/macro/indicators` | 指标定义列表 |
| GET | `/api/macro/snapshot` | 宏观快照（`?force=true` 强制刷新） |
| GET | `/api/macro/series` | 时间序列 |
| GET | `/api/macro/scores` | 分组评分 |
| POST | `/api/macro/refresh` | 刷新缓存 |

### 股票数据

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stocks/snapshot` | 股票快照 |
| GET | `/api/stocks/search?q=` | 搜索股票 |
| GET | `/api/stocks/quote?symbol=` | 单只报价 |
| POST | `/api/stocks/refresh` | 刷新股票缓存 |

### AI 分析

AI 服务使用 OpenAI 兼容的 `POST {Base URL}/chat/completions` 协议。Base URL 应包含 API 版本前缀，例如 `https://api.openai.com/v1`；非本机地址必须使用 HTTPS。

| 方法 | 路径 | 保护方式 | 说明 |
|------|------|----------|------|
| GET | `/api/ai/config/status` | 无 | 仅返回服务地址、模型和脱敏后的 Key 状态 |
| POST | `/api/ai/config/test` | `X-AI-Admin-Password` | 测试候选配置，不保存 |
| PUT | `/api/ai/config` | `X-AI-Admin-Password` | 原子保存服务配置 |
| POST | `/api/ai/analyze` | `X-AI-Analysis-Password` | 分析当前股票；`force: true` 强制重新生成 |
| GET | `/api/ai/analysis/{ticker}?lang=zh` | `X-AI-Analysis-Password` | 读取当前配置对应的最近缓存 |

AI 只使用后端提供的股票快照、因子和宏观数据，不读取新闻，也不会生成目标价。结果仅供研究参考，不构成投资建议。

### Qlib 研究

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/research/dataset` | 读取当前可复现的数据集版本 |
| POST | `/api/research/dataset/refresh` | 异步刷新 A 股前复权日线数据集 |
| GET | `/api/research/ranking` | 使用五项因子权重返回当期排名 |
| POST | `/api/research/backtests` | 创建只读 Top-N 日频回测 |
| GET | `/api/research/backtests/{job_id}` | 轮询回测或数据刷新的状态与结果 |

该能力不包含交易执行、订单、经纪商连接或模拟盘。

API 文档：http://127.0.0.1:8000/docs

## 宏观指标

涵盖 Growth、Liquidity、Inflation、Property、External、Rates 六组指标，包括：

PMI · M1 · M2 · 社会融资 · 新增贷款 · CPI · PPI · 固定资产投资 · 商品房销售面积 · 城镇失业率 · 外汇储备 · 10 年期国债收益率 · USD/CNY

## 免责声明

本项目仅供学习与研究，不构成任何投资建议。数据来源于第三方公开接口，准确性不作保证。

## License

MIT
