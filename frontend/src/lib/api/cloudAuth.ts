const CLOUD_TOKEN_KEY = "cloud_token";

export function getCloudToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CLOUD_TOKEN_KEY);
}

type CloudTokenListener = () => void;

const listeners = new Set<CloudTokenListener>();
let storageListenerBound = false;

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeCloudToken(listener: CloudTokenListener) {
  listeners.add(listener);

  if (!storageListenerBound && typeof window !== "undefined") {
    storageListenerBound = true;
    window.addEventListener("storage", (e) => {
      if (e.key !== CLOUD_TOKEN_KEY) return;
      notify();
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

export function setCloudToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLOUD_TOKEN_KEY, token);
  notify();
}

export function clearCloudToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLOUD_TOKEN_KEY);
  notify();
}

