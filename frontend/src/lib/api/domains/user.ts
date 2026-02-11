import { get } from "@/lib/api/client";
import type { UserMe, UserPublic } from "@/lib/api/types";

export const userApi = {
  get: (id: number) => get<UserPublic>(`/users/${id}`),
  me: () => get<UserMe>("/users/me"),
};
