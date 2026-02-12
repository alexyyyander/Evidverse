import { get } from "@/lib/api/client";
import type { UserMe, UserPublic } from "@/lib/api/types";

export const userApi = {
  get: (id: string) => get<UserPublic>(`/users/${id}`),
  me: () => get<UserMe>("/users/me"),
  search: (params: { query: string; skip?: number; limit?: number }) => get<UserPublic[]>("/users/search", params),
};
