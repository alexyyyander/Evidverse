import { useSyncExternalStore } from "react";
import { getToken, subscribeToken } from "@/lib/api/auth";

export function useAuthToken() {
  return useSyncExternalStore(subscribeToken, getToken, () => null);
}

