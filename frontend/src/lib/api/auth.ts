const TOKEN_KEY = "token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

type TokenListener = () => void;

const listeners = new Set<TokenListener>();
let storageListenerBound = false;

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeToken(listener: TokenListener) {
  listeners.add(listener);

  if (!storageListenerBound && typeof window !== "undefined") {
    storageListenerBound = true;
    window.addEventListener("storage", (e) => {
      if (e.key !== TOKEN_KEY) return;
      notify();
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  notify();
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  notify();
}
