import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AuthDialog({
  open,
  mode,
  resetToken,
  t,
  onClose,
  onModeChange,
  onSubmit,
  onRequestReset,
  onConfirmReset,
  onResetComplete,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError("");
      setResetRequested(false);
    }
  }, [open, mode]);

  if (!open) return null;
  const account = t.account;
  const isRegistering = mode === "register";
  const isResetRequest = mode === "reset-request";
  const isResetConfirmation = mode === "reset-confirm";
  const title = isResetRequest
    ? account.resetRequestTitle
    : isResetConfirmation
      ? account.resetConfirmTitle
      : isRegistering
        ? account.registerTitle
        : account.loginTitle;
  const description = isResetRequest
    ? account.resetRequestDescription
    : isResetConfirmation
      ? account.resetConfirmDescription
      : account.description;
  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (isResetRequest) {
        await onRequestReset(email);
        setResetRequested(true);
        return;
      }
      if (isResetConfirmation) {
        await onConfirmReset(resetToken, password);
        onResetComplete();
        onClose();
        return;
      }
      await onSubmit({ email, password });
      onClose();
    } catch (requestError) {
      setError(account.errors[requestError.code] ?? account.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="auth-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
      <button type="button" className="auth-dialog-close" onClick={onClose} aria-label={account.close}><X size={18} /></button>
      <small>QuantDesk</small>
      <h2 id="auth-dialog-title">{title}</h2>
      <p>{description}</p>
      <form onSubmit={submit}>
        {!isResetConfirmation && <label>{account.email}<input type="email" value={email} autoComplete="email" required onChange={(event) => setEmail(event.target.value)} /></label>}
        {!isResetRequest && <label>{account.password}<input type="password" value={password} autoComplete={isRegistering || isResetConfirmation ? "new-password" : "current-password"} minLength="10" maxLength="128" required onChange={(event) => setPassword(event.target.value)} /><small>{account.passwordHint}</small></label>}
        {error && <p className="auth-dialog-error" role="alert">{error}</p>}
        {resetRequested ? <p className="auth-dialog-success" role="status">{account.resetRequestSent}</p> : <button type="submit" className="primary" disabled={submitting}>{submitting ? account.submitting : isResetRequest ? account.submitResetRequest : isResetConfirmation ? account.submitResetConfirm : isRegistering ? account.submitRegister : account.submitLogin}</button>}
      </form>
      {!isResetRequest && !isResetConfirmation && <>
        <button type="button" className="auth-dialog-switch" onClick={() => onModeChange("reset-request")}>{account.forgotPassword}</button>
        <button type="button" className="auth-dialog-switch" onClick={() => onModeChange(isRegistering ? "login" : "register")}>{isRegistering ? account.switchToLogin : account.switchToRegister}</button>
      </>}
      {isResetRequest && <button type="button" className="auth-dialog-switch" onClick={() => onModeChange("login")}>{account.switchToLogin}</button>}
    </section>
  </div>;
}
