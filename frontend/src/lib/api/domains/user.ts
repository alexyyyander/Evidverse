import { get } from "@/lib/api/client";
import type { UserPublic } from "@/lib/api/types";

export const userApi = {
  get: (id: number) => get<UserPublic>(`/users/${id}`),
};

