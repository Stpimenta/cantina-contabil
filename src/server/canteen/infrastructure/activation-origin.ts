// Next development builds request.url with its listening hostname, while Host
// retains the browser-facing address. Production only accepts the public URL.
export function isActivationOriginAllowed(
  request: Request,
  production: boolean,
): boolean {
  const origin = request.headers.get("Origin");
  if (!origin || origin === "null") return false;
  const url = new URL(request.url);
  if (origin === url.origin) return true;
  const host = request.headers.get("Host");
  return !production && host !== null && origin === `${url.protocol}//${host}`;
}
