const configuredApiOrigin = import.meta.env.VITE_API_BASE_URL?.trim();

function resolveApiOrigin(value: string | undefined) {
  if (!value) {
    if (import.meta.env.PROD) {
      throw new Error("Set VITE_API_BASE_URL to the deployed Python API origin before building.");
    }
    return "";
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_API_BASE_URL must be an absolute HTTP(S) URL.");
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("VITE_API_BASE_URL must be a credential-free HTTP(S) origin.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("VITE_API_BASE_URL must contain only an origin, without a path or query.");
  }
  if (import.meta.env.PROD && url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Production API origins must use HTTPS.");
  }

  return url.origin;
}

export const API_ORIGIN = resolveApiOrigin(configuredApiOrigin);
export const apiUrl = (path: string) => `${API_ORIGIN}${path}`;
