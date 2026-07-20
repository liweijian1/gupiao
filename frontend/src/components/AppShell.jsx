import { Activity, BarChart3, Bell, BookOpenCheck, Database, Download, LineChart, Menu, Search, Settings2 } from "lucide-react";

const NAV_ICONS = [BarChart3, Activity, LineChart, BookOpenCheck, Database];
const RAIL_LABELS = ["总览", "股票", "宏观", "图表", "报告"];

export function AppShell({ t, lang, stockQuery, activeNav, stockSourceStatus, macroSourceStatus, reportButtonRef, onStockQueryChange, onLanguageChange, onNavigate, onOpenAiSettings, onExportReport, children }) {
  return <main className="terminal decision-terminal">
    <aside className="rail decision-rail">
      <button type="button" className="rail-menu" aria-label="Menu"><Menu size={22} aria-hidden="true" /></button>
      <nav aria-label="QuantDesk">
        {NAV_ICONS.map((Icon, index) => <button type="button" className={activeNav === index ? "active" : ""} aria-current={activeNav === index ? "page" : undefined} aria-label={RAIL_LABELS[index]} data-tooltip={RAIL_LABELS[index]} onClick={() => onNavigate(index)} key={RAIL_LABELS[index]}><Icon size={19} aria-hidden="true" /><span>{RAIL_LABELS[index]}</span></button>)}
      </nav>
      <div className="rail-bottom"><Bell size={19} aria-hidden="true" /><Database size={19} aria-label={macroSourceStatus.label} /></div>
    </aside>
    <section className="workspace decision-workspace">
      <header className="topbar decision-command-bar">
        <div className="decision-brand"><strong>{lang === "zh" ? "决策驾驶舱" : "Decision Cockpit"}</strong><small>QuantDesk {t.lab}</small></div>
        <label className="searchbox"><Search size={17} aria-hidden="true" /><input value={stockQuery} onChange={(event) => onStockQueryChange(event.target.value)} placeholder={t.search} aria-label={t.search} /><kbd>⌘ K</kbd></label>
        <div className="command-status"><i /><span>{lang === "zh" ? "数据源" : "Source"}: {stockSourceStatus.label}</span><span>{new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date())}</span></div>
        <div className="command-actions"><div className="segmented language-toggle" role="group" aria-label={t.language}><button type="button" className={lang === "zh" ? "selected" : ""} aria-pressed={lang === "zh"} onClick={() => onLanguageChange("zh")}>中</button><button type="button" className={lang === "en" ? "selected" : ""} aria-pressed={lang === "en"} onClick={() => onLanguageChange("en")}>EN</button></div><button type="button" className="ghost command-ai" data-ai-settings-trigger onClick={onOpenAiSettings}><Settings2 size={15} /> {t.ai.settings}</button><button type="button" className="ghost command-export" ref={reportButtonRef} onClick={onExportReport}><Download size={15} /> {t.export}</button></div>
      </header>
      {children}
      <footer className="decision-footer"><span>{lang === "zh" ? "数据源：同花顺 Level-2 + 宏观数据（国家统计局、央行、Wind）" : "Source: market and macro data"}</span><span>{t.ai.disclaimer}</span></footer>
    </section>
  </main>;
}
