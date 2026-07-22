import { useCallback, useEffect, useState } from "react";

import {
  confirmPasswordReset,
  getSession,
  loginAccount,
  logoutAccount,
  registerAccount,
  requestPasswordReset,
} from "../api/auth.js";

export function useAuth() {
  const [state, setState] = useState({ status: "loading", user: null, error: null });

  const restore = useCallback(async () => {
    try {
      const payload = await getSession();
      setState({ status: payload.user ? "authenticated" : "anonymous", user: payload.user, error: null });
    } catch (error) {
      setState({ status: "anonymous", user: null, error });
    }
  }, []);

  useEffect(() => { restore(); }, [restore]);

  const submit = useCallback(async (request, credentials) => {
    setState((current) => ({ ...current, status: "submitting", error: null }));
    try {
      const payload = await request(credentials);
      setState({ status: "authenticated", user: payload.user, error: null });
      return payload.user;
    } catch (error) {
      setState({ status: "anonymous", user: null, error });
      throw error;
    }
  }, []);

  const login = useCallback((credentials) => submit(loginAccount, credentials), [submit]);
  const register = useCallback((credentials) => submit(registerAccount, credentials), [submit]);
  const logout = useCallback(async () => {
    await logoutAccount();
    setState({ status: "anonymous", user: null, error: null });
  }, []);
  const requestReset = useCallback((email) => requestPasswordReset(email), []);
  const confirmReset = useCallback(async (token, password) => {
    await confirmPasswordReset(token, password);
    await restore();
  }, [restore]);

  return { ...state, login, register, logout, restore, requestReset, confirmReset };
}
