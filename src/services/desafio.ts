// src/services/desafio.ts
import { request } from "./api";
import type { Desafio } from "../types/desafios";

export interface CrearDesafioPayload {
  retadora_pareja_id: number;
  retada_pareja_id: number;
  fecha: string; // "YYYY-MM-DD"
  hora: string;  // "HH:MM:SS"
  observacion?: string | null;
}

// --------- listar desafíos del jugador autenticado ---------
export async function getMisProximosDesafios(): Promise<Desafio[]> {
  return request<Desafio[]>("/desafios/mis-proximos");
}

// ✅ obtener desafío por ID
export async function getDesafioById(id: number): Promise<Desafio> {
  return request<Desafio>(`/desafios/${id}`);
}

// --------- crear desafío ---------
export async function crearDesafio(payload: CrearDesafioPayload): Promise<Desafio> {
  return request<Desafio>("/desafios", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --------- aceptar / rechazar ---------
export async function aceptarDesafio(id: number): Promise<Desafio> {
  return request<Desafio>(`/desafios/${id}/aceptar`, { method: "POST" });
}

export async function rechazarDesafio(id: number): Promise<Desafio> {
  return request<Desafio>(`/desafios/${id}/rechazar`, { method: "POST" });
}

// --------- Cargar resultado de un desafío ---------
export type CargarResultadoPayload = {
  desafio_id: number;

  // ✅ NUEVO: fecha jugado real (YYYY-MM-DD)
  fecha_jugado?: string | null;

  set1_retador: number;
  set1_desafiado: number;
  set2_retador: number;
  set2_desafiado: number;
  set3_retador: number | null;
  set3_desafiado: number | null;
};

export async function cargarResultadoDesafio(payload: CargarResultadoPayload): Promise<Desafio> {
  const { desafio_id, ...body } = payload;

  return request<Desafio>(`/desafios/${desafio_id}/resultado`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
