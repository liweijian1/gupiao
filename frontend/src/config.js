// Local development uses Vite's same-origin proxy and a neutral path so browser
// security tools do not need direct access to the backend port or `/api`.
const configuredApiBase = import.meta.env.VITE_API_BASE_URL ?? "/quantdesk-api";

// API clients append `/api/...`; deployment bases therefore name the app prefix,
// not the API prefix. Normalize an older `/api` base to avoid `/api/api/...`.
export const API_BASE_URL = configuredApiBase.replace(/\/api$/, "");
