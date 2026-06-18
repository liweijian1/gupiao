# Stock Macro Terminal

中国宏观数据与股票量化筛选终端。前端为 React 仪表盘，后端通过 AkShare / Baostock 拉取数据，提供宏观指标评分、股票快照与搜索 API。

## 功能

- **宏观实验室**：PMI、M1/M2、社融、CPI/PPI 等 13 项中国宏观序列，归一化后计算综合评分
- **量化筛选**：多因子打分、排序、搜索，支持 A 股 / 港股 / 美股示例池
- **数据管道**：本地缓存快照，支持手动刷新；AkShare 不可用时自动降级为 mock 数据
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

- Python 3.12+（推荐 3.14，AkShare 需在此环境安装）
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

API 文档：http://127.0.0.1:8000/docs

## 宏观指标

涵盖 Growth、Liquidity、Inflation、Property、External、Rates 六组指标，包括：

PMI · M1 · M2 · 社会融资 · 新增贷款 · CPI · PPI · 固定资产投资 · 商品房销售面积 · 城镇失业率 · 外汇储备 · 10 年期国债收益率 · USD/CNY

## 免责声明

本项目仅供学习与研究，不构成任何投资建议。数据来源于第三方公开接口，准确性不作保证。

## License

MIT
