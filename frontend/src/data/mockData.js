export const stocks = [
  { ticker: "NVDA", name: "NVIDIA", aliases: ["英伟达"], exchange: "NASDAQ", currency: "$", sector: "Semis", price: 178.42, chg: 2.8, score: 92, pe: 38.6, growth: 31.2, rsi: 63, beta: 1.7, trend: 88, liquidity: 96 },
  { ticker: "MSFT", name: "Microsoft", aliases: ["微软"], exchange: "NASDAQ", currency: "$", sector: "Software", price: 503.71, chg: 0.9, score: 88, pe: 34.1, growth: 14.5, rsi: 58, beta: 0.9, trend: 81, liquidity: 93 },
  { ticker: "AVGO", name: "Broadcom", aliases: ["博通"], exchange: "NASDAQ", currency: "$", sector: "Semis", price: 291.33, chg: 1.5, score: 86, pe: 32.8, growth: 18.9, rsi: 61, beta: 1.3, trend: 84, liquidity: 89 },
  { ticker: "AAPL", name: "Apple", aliases: ["苹果"], exchange: "NASDAQ", currency: "$", sector: "Hardware", price: 214.15, chg: -0.4, score: 74, pe: 29.3, growth: 4.1, rsi: 47, beta: 1.1, trend: 58, liquidity: 95 },
  { ticker: "JPM", name: "JPMorgan", aliases: ["摩根大通"], exchange: "NYSE", currency: "$", sector: "Banks", price: 266.22, chg: 0.3, score: 71, pe: 13.2, growth: 6.8, rsi: 52, beta: 1.0, trend: 62, liquidity: 87 },
  { ticker: "XOM", name: "Exxon Mobil", aliases: ["埃克森美孚"], exchange: "NYSE", currency: "$", sector: "Energy", price: 109.84, chg: -1.1, score: 62, pe: 15.4, growth: -1.7, rsi: 41, beta: 0.8, trend: 39, liquidity: 78 },
  { ticker: "COST", name: "Costco", aliases: ["开市客"], exchange: "NASDAQ", currency: "$", sector: "Retail", price: 983.44, chg: 0.6, score: 79, pe: 52.7, growth: 8.2, rsi: 55, beta: 0.7, trend: 67, liquidity: 75 },
  { ticker: "AMD", name: "AMD", aliases: ["超威半导体"], exchange: "NASDAQ", currency: "$", sector: "Semis", price: 126.91, chg: -2.2, score: 69, pe: 41.4, growth: 12.4, rsi: 38, beta: 1.9, trend: 44, liquidity: 91 },
  { ticker: "600519", name: "Kweichow Moutai", aliases: ["贵州茅台", "茅台", "600519.SH"], exchange: "SSE", currency: "¥", sector: "Consumer", price: 1468.6, chg: 0.7, score: 83, pe: 23.4, growth: 15.1, rsi: 56, beta: 0.6, trend: 73, liquidity: 88 },
  { ticker: "300750", name: "CATL", aliases: ["宁德时代", "300750.SZ"], exchange: "SZSE", currency: "¥", sector: "NewEnergy", price: 258.2, chg: 1.8, score: 87, pe: 24.9, growth: 21.7, rsi: 62, beta: 1.4, trend: 79, liquidity: 91 },
  { ticker: "002594", name: "BYD", aliases: ["比亚迪", "002594.SZ"], exchange: "SZSE", currency: "¥", sector: "Auto", price: 312.5, chg: 1.2, score: 84, pe: 28.1, growth: 18.4, rsi: 59, beta: 1.2, trend: 77, liquidity: 89 },
  { ticker: "600036", name: "China Merchants Bank", aliases: ["招商银行", "招行", "600036.SH"], exchange: "SSE", currency: "¥", sector: "Banks", price: 41.2, chg: -0.3, score: 72, pe: 7.3, growth: 3.2, rsi: 49, beta: 0.8, trend: 57, liquidity: 92 },
  { ticker: "601318", name: "Ping An Insurance", aliases: ["中国平安", "平安", "601318.SH"], exchange: "SSE", currency: "¥", sector: "Insurance", price: 52.8, chg: 0.5, score: 70, pe: 8.6, growth: 4.9, rsi: 51, beta: 0.9, trend: 61, liquidity: 90 },
  { ticker: "000858", name: "Wuliangye", aliases: ["五粮液", "000858.SZ"], exchange: "SZSE", currency: "¥", sector: "Consumer", price: 128.4, chg: -0.8, score: 68, pe: 18.9, growth: 6.1, rsi: 44, beta: 0.7, trend: 48, liquidity: 84 },
  { ticker: "600276", name: "Hengrui Medicine", aliases: ["恒瑞医药", "600276.SH"], exchange: "SSE", currency: "¥", sector: "Healthcare", price: 47.6, chg: 2.1, score: 76, pe: 39.5, growth: 12.7, rsi: 64, beta: 1.0, trend: 69, liquidity: 82 },
  { ticker: "0700.HK", name: "Tencent", aliases: ["腾讯控股", "腾讯", "00700", "700.HK"], exchange: "HKEX", currency: "HK$", sector: "Internet", price: 418.0, chg: 0.4, score: 82, pe: 19.7, growth: 10.5, rsi: 54, beta: 1.1, trend: 71, liquidity: 94 },
  { ticker: "9988.HK", name: "Alibaba", aliases: ["阿里巴巴", "阿里", "BABA"], exchange: "HKEX", currency: "HK$", sector: "Internet", price: 89.7, chg: -0.6, score: 73, pe: 13.8, growth: 5.8, rsi: 46, beta: 1.2, trend: 55, liquidity: 93 },
];

export const macroInputs = [
  { key: "PMI", group: "Growth", api: "macro_china_pmi()", value: 50.4, unit: "", direction: 1, z: 0.42, weight: 0.35 },
  { key: "M1", group: "Liquidity", api: "macro_china_supply_of_money()", value: 5.8, unit: "%", direction: 1, z: -0.18, weight: 0.2 },
  { key: "M2", group: "Liquidity", api: "macro_china_supply_of_money()", value: 7.0, unit: "%", direction: 1, z: 0.12, weight: 0.25 },
  { key: "Social Financing", group: "Liquidity", api: "macro_china_shrzgm()", value: 2.28, unit: "T CNY", direction: 1, z: 0.36, weight: 0.25 },
  { key: "New Loans", group: "Liquidity", api: "macro_rmb_loan()", value: 0.95, unit: "T CNY", direction: 1, z: 0.08, weight: 0.15 },
  { key: "CPI", group: "Inflation", api: "macro_china_cpi()", value: 0.3, unit: "%", direction: 1, z: -0.34, weight: 0.55 },
  { key: "PPI", group: "Inflation", api: "macro_china_ppi()", value: -1.4, unit: "%", direction: 1, z: -0.61, weight: 0.45 },
  { key: "Fixed Asset Inv.", group: "Growth", api: "macro_china_gdzctz()", value: 3.7, unit: "%", direction: 1, z: 0.18, weight: 0.25 },
  { key: "Home Sales Area", group: "Property", api: "macro_china_nbs_nation()", value: -19.1, unit: "%", direction: 1, z: -0.82, weight: 0.2 },
  { key: "Unemployment", group: "Growth", api: "macro_china_urban_unemployment()", value: 5.0, unit: "%", direction: -1, z: 0.2, weight: 0.2 },
  { key: "FX Reserves", group: "External", api: "macro_china_fx_reserves_yearly()", value: 3.23, unit: "T USD", direction: 1, z: 0.09, weight: 0.45 },
  { key: "CN 10Y Yield", group: "Rates", api: "bond_china_yield()", value: 1.72, unit: "%", direction: -1, z: -0.38, weight: 0.15 },
  { key: "USD/CNY", group: "External", api: "currency_history()", value: 7.18, unit: "", direction: -1, z: 0.28, weight: 0.55 },
];

export const factorDefaults = {
  momentum: 68,
  quality: 52,
  valuation: 35,
  liquidity: 70,
  volatility: 45,
};

export const spark = [38, 44, 41, 52, 48, 61, 58, 66, 72, 69, 78, 84];
export const macroTrend = [48, 50, 52, 55, 53, 56, 58, 61, 60, 64, 66, 68];
