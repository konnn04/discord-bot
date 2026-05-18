import { TOKEN_KEY, TOKEN_EXPIRY_KEY } from "@/lib/config";

export function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;

  if (Date.now() > parseInt(expiry, 10)) {
    clearStoredToken();
    return null;
  }

  return token;
}

export function storeToken(token: string, expiresIn: number) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(
    TOKEN_EXPIRY_KEY,
    (Date.now() + expiresIn * 1000).toString(),
  );
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}
