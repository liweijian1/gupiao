export function getPasswordResetToken(pathname, search) {
  const route = String(pathname ?? "").replace(/\/+$/, "");
  if (!route.endsWith("/reset-password")) return null;
  const token = new URLSearchParams(search ?? "").get("token")?.trim();
  return token || null;
}

export function clearPasswordResetPath(pathname) {
  const route = String(pathname ?? "").replace(/\/+$/, "");
  const base = route.endsWith("/reset-password") ? route.slice(0, -"/reset-password".length) : route;
  return `${base || ""}/`;
}
