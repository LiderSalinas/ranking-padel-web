// src/services/desafio.ts
import { request } from "./api";
import type { Desafio } from "../types/desafios";

export interface CrearDesafioPayload {
  // ⚠️ Backend ahora calcula retadora por token.
  // Mantengo el campo para no romper llamadas viejas, pero NO se envía.
  retadora_pareja_id?: number;

  retada_pareja_id: number;
  fecha: string; // "YYYY-MM-DD"
  hora: string;  // "H" | "HH" | "H:MM" | "HH:MM" | "HH:MM:SS" -> se fuerza HH:00:00
  observacion?: string | null;
}

// helper interno: fuerza HH:00:00 (acepta "H", "HH", "H:MM", "HH:MM" o "HH:MM:SS")
function horaRedonda(hora: string): string {
  const h = (hora || "").trim();

  // si viene vacío, por defecto 00:00:00
  if (!h) return "00:00:00";

  // capturo la primera parte antes de ":" (puede ser "7" o "07" o "07:30")
  const first = h.split(":")[0] ?? "";
  const hhNum = Number(first);

  // si no es número válido o fuera de 0-23, fallback
  if (!Number.isFinite(hhNum) || hhNum < 0 || hhNum > 23) return "00:00:00";

  const hh = String(hhNum).padStart(2, "0");
  return `${hh}:00:00`;
}

// --------- listar desafíos del jugador autenticado ---------
export async function getMisProximosDesafios(): Promise<Desafio[]> {
  return request<Desafio[]>("/desafios/mis-proximos");
}

// --------- listar TODOS mis desafíos (histórico) ---------
export async function getMisDesafios(): Promise<Desafio[]> {
  return request<Desafio[]>("/desafios/mis-desafios");
}

// --------- listar próximos global (pendiente/aceptado) ---------
export async function getProximosDesafios(): Promise<Desafio[]> {
  return request<Desafio[]>("/desafios/proximos");
}

// --------- obtener desafío por ID ---------
export async function getDesafioById(id: number): Promise<Desafio> {
  return request<Desafio>(`/desafios/${id}`);
}

// --------- crear desafío ---------
export async function crearDesafio(payload: CrearDesafioPayload): Promise<Desafio> {
  // ✅ backend calcula retadora por token, así que no mandamos retadora_pareja_id
  const body = {
    retada_pareja_id: payload.retada_pareja_id,
    fecha: payload.fecha,
    hora: horaRedonda(payload.hora),
    observacion: payload.observacion ?? null,
  };

  return request<Desafio>("/desafios", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --------- aceptar / rechazar ---------
export async function aceptarDesafio(id: number): Promise<Desafio> {
  return request<Desafio>(`/desafios/${id}/aceptar`, { method: "POST" });
}

export async function rechazarDesafio(id: number): Promise<Desafio> {
  return request<Desafio>(`/desafios/${id}/rechazar`, { method: "POST" });
}

// --------- reprogramar desafío ---------
export type ReprogramarDesafioPayload = {
  fecha: string;
  hora: string; // "H" | "HH" | "H:MM" | "HH:MM" | "HH:MM:SS" -> se fuerza HH:00:00
};

export async function reprogramarDesafio(
  id: number,
  payload: ReprogramarDesafioPayload
): Promise<Desafio> {
  const body = {
    fecha: payload.fecha,
    hora: horaRedonda(payload.hora),
  };

  return request<Desafio>(`/desafios/${id}/reprogramar`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ✅ trae tu DUPLA (para mostrarla bloqueada en el modal)
export type MiDuplaResponse = {
  id: number;
  etiqueta: string; // "Nombre Apellido / Nombre Apellido"
  nombre?: string | null;
  grupo?: string | null;
  posicion?: number | null;
};

export async function getMiDupla(): Promise<MiDuplaResponse> {
  return request<MiDuplaResponse>("/desafios/mi-dupla");
}

// --------- cargar resultado ---------
export type CargarResultadoPayload = {
  desafio_id: number;

  // backend acepta null o no enviar, y si no viene usa hoy
  fecha_jugado?: string | null;

  set1_retador: number;
  set1_desafiado: number;
  set2_retador: number;
  set2_desafiado: number;
  set3_retador: number | null;
  set3_desafiado: number | null;
};

export async function cargarResultadoDesafio(
  payload: CargarResultadoPayload
): Promise<Desafio> {
  const { desafio_id, ...body } = payload;

  return request<Desafio>(`/desafios/${desafio_id}/resultado`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* =========================================================
   ✅ NUEVO (pedido cliente): "Muro" para que TODOS vean
   - Partidos por jugar (global): /desafios/proximos
   - Partidos ya jugados (al menos del usuario): /desafios/mis-desafios
   (Si mañana agregás endpoint de jugados global, lo enchufamos acá)
========================================================= */

// helper: timestamp para ordenar "más reciente primero"
function desafioTime(d: Desafio): number {
  const hora = (d.hora || "00:00:00").slice(0, 8);

  const fj = (d as any).fecha_jugado as string | undefined;
  const baseFecha =
    d.estado === "Jugado" && fj && fj.trim() ? fj : d.fecha;

  return new Date(`${baseFecha}T${hora}`).getTime();
}

// ✅ Muro: combina global por jugar + mis jugados, sin duplicar
// ✅ MURO GLOBAL: viene directo del backend
export async function getMuroDesafios(): Promise<Desafio[]> {
  return request<Desafio[]>("/desafios/muro");
}

// (opcional) si querés tu historial ordenado por muro
export async function getTodosMisDesafiosOrdenado(): Promise<Desafio[]> {
  const mis = await getMisDesafios();
  return [...(mis || [])].sort((a, b) => desafioTime(b) - desafioTime(a));
}
