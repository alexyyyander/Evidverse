import { cloudApiClient } from "@/lib/api/cloudClient";

export const cloudAuthApi = {
  login: async (payload: { email: string; password: string }) => {
    const body = new URLSearchParams();
    body.set("username", payload.email);
    body.set("password", payload.password);
    const res = await cloudApiClient.post<{ access_token: string; token_type: string }>("/auth/login", body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return res.data;
  },
};

