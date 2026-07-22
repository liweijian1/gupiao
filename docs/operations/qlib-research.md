# Qlib A 股日频研究运行说明

## 运行边界

- 仅处理 A 股前复权日线。
- 研究数据、因子排名与回测均为只读功能。
- 不提供订单、交易执行、经纪商连接、模拟盘或实盘功能。

## Python 与存储

生产后端使用 CPython 3.11。Qlib 0.9.7 在该运行时随 `backend/requirements.txt` 安装；本机 Python 3.14 仅用于不导入 Qlib 的纯逻辑测试。

配置持久化目录，且不要将其放在 release 目录中：

```bash
export RESEARCH_DATA_DIR=/opt/stock-macro-terminal/data/research
```

该目录包含：

- `datasets/<dataset-id>/`：规范化日线、manifest 与 Qlib bin provider。
- `current.json`：当前完整数据集的原子指针。
- `results/<job-id>.json`：只读回测和刷新任务的可轮询状态。

刷新先写入新版本并验证 Qlib provider；只有验证成功才切换 `current.json`。失败时保留原数据集。

## 预检

```bash
cd /opt/stock-macro-terminal/current/backend
/opt/stock-macro-terminal/venv/bin/python -c "import qlib; print(qlib.__version__)"
/opt/stock-macro-terminal/venv/bin/python -m pytest tests/test_qlib_dataset_integration.py -m qlib -q
/opt/stock-macro-terminal/venv/bin/python -m pytest -q
```

之后构建前端：

```bash
cd /opt/stock-macro-terminal/current/frontend
npm run build
```

Nginx 仅应将 `/stock-macro/api/` 转发到本服务。不得更改已有 `/api/` 上游或其路由。

## 发布后验收

1. 调用 `POST /stock-macro/api/research/dataset/refresh`，使用初始 A 股股票池和两个完整日历年的日期区间。
2. 轮询 `GET /stock-macro/api/research/backtests/{job_id}` 至刷新任务完成，确认返回 manifest、Qlib 版本与数据集 fingerprint。
3. 调用排名接口，确认结果包含相同 fingerprint。
4. 创建回测并确认结果包含样本期、调仓频率、成本、净值点、指标与数据版本。
5. 刷新网页，确认既有结果仍可读取；AI 分析中仅在代码和数据版本匹配时显示研究证据版本。
