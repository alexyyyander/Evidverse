import { useSyncExternalStore } from "react";
import { getCloudToken, subscribeCloudToken } from "@/lib/api/cloudAuth";

export function useCloudAuthToken() {
  return useSyncExternalStore(subscribeCloudToken, getCloudToken, () => null);
}

