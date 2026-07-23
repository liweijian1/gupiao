// Local development uses Vite's same-origin proxy and a neutral path so browser
// security tools do not need direct access to the backend port or `/api`.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/quantdesk-api";
