// src/types/auth.ts

export interface AuthLoginLinkResponse {
  login_url: string; // si tu backend no lo devuelve, borralo
  token: string;
}

export interface AuthMeResponse {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
}
