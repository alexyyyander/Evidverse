import { apiClient } from "@/lib/api/client";
import type { TokenResponse, UserMe } from "@/lib/api/types";

export const authApi = {
  register: async (data: { email: string; password: string }) => {
    const res = await apiClient.post<UserMe>("/auth/register", data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const form = new URLSearchParams();
    form.set("username", data.email);
    form.set("password", data.password);
    const res = await apiClient.post<TokenResponse>("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data;
  },
};

