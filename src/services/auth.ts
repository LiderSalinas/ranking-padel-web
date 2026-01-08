// src/services/auth.ts
import { request } from "./api";

export type LoginLinkResponse = {
  login_url?: string;
  token: string;
};

export async function login(email: string) {
  const data = await request<LoginLinkResponse>("/auth/login-link", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (!data?.token) throw new Error("No token");

  localStorage.setItem("token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}
