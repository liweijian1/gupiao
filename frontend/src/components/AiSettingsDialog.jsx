import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, X } from "lucide-react";

import { getAiConfigStatus, saveAiConfig, testAiConfig } from "../api/ai.js";


export function AiSettingsDialog({ open, onClose, t, onSaved }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const clearSensitiveState = () => {
    setApiKey("");
    setAdminPassword("");
  };

  const closeDialog = () => {
    clearSensitiveState();
    setNotice("");
    setErrorCode("");
    onClose();
  };

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setPending(true);
    setNotice("");
    setErrorCode("");
    getAiConfigStatus()
      .then((status) => {
        if (!active) return;
        setBaseUrl(status.base_url ?? "");
        setModel(status.model ?? "");
        setMaskedKey(status.api_key_masked ?? "");
      })
      .catch(() => active && setErrorCode("generic"))
      .finally(() => active && setPending(false));
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      active = false;
      window.removeEventListener("keydown", handleKeyDown);
      clearSensitiveState();
    };
  }, [open]);

  if (!open) return null;

  const candidate = { base_url: baseUrl, model, api_key: apiKey };
  const runAction = async (action) => {
    setPending(true);
    setNotice("");
    setErrorCode("");
    try {
      if (action === "test") {
        await testAiConfig(candidate, adminPassword);
        setNotice(t.ai.connectionOk);
      } else {
        const status = await saveAiConfig(candidate, adminPassword);
        setMaskedKey(status.api_key_masked ?? "");
        setApiKey("");
        setNotice(t.ai.saved);
        onSaved?.(status);
      }
    } catch (error) {
      setErrorCode(error.code ?? "generic");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="ai-settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
      <section className="ai-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title">
        <header>
          <div>
            <small>{t.ai.provider}</small>
            <h2 id="ai-settings-title">{t.ai.settings}</h2>
          </div>
          <button type="button" className="icon-button" onClick={closeDialog} aria-label={t.ai.close}>
            <X size={17} />
          </button>
        </header>
        <div className="ai-settings-fields">
          <label>
            <span>{t.ai.baseUrl}</span>
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.openai.com/v1"
              autoComplete="url"
              disabled={pending}
            />
          </label>
          <label>
            <span>{t.ai.model}</span>
            <input value={model} onChange={(event) => setModel(event.target.value)} autoComplete="off" disabled={pending} />
          </label>
          <label>
            <span>{t.ai.apiKey}</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={maskedKey || t.ai.apiKeyPlaceholder}
              autoComplete="new-password"
              disabled={pending}
            />
            {maskedKey && <small>{t.ai.configuredKey}: {maskedKey}</small>}
          </label>
          <label>
            <span>{t.ai.adminPassword}</span>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              autoComplete="current-password"
              disabled={pending}
            />
          </label>
        </div>
        {errorCode && <p className="ai-message error" role="alert">{t.ai.errors[errorCode] ?? t.ai.errors.generic}</p>}
        {notice && <p className="ai-message success"><CheckCircle2 size={15} /> {notice}</p>}
        <footer className="ai-dialog-actions">
          <button type="button" className="ghost" onClick={() => runAction("test")} disabled={pending || !baseUrl || !model || !adminPassword}>
            {pending && <LoaderCircle className="spin" size={15} />} {t.ai.testConnection}
          </button>
          <button type="button" className="primary" onClick={() => runAction("save")} disabled={pending || !baseUrl || !model || !adminPassword}>
            {t.ai.save}
          </button>
        </footer>
      </section>
    </div>
  );
}
