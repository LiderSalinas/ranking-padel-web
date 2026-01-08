// src/services/parejas.ts

import { request } from "./api";
import type { ParejaDesafiable } from "../types/parejas";

/**
 * Trae las parejas que el jugador actual puede desafiar.
 * Endpoint backend: GET /parejas/desafiables
 */
export async function getParejasDesafiables(): Promise<ParejaDesafiable[]> {
  // Pedimos al backend la lista
  const data = await request<any[]>("/parejas/desafiables", {
    method: "GET",
  });

  // Normalizamos la respuesta a nuestro tipo ParejaDesafiable
  return data.map((p: any) => ({

    id: Number(p.id),
    // algunos backends usan "nombre", otros "etiqueta": cubrimos ambos
    nombre: p.nombre ?? p.etiqueta ?? "",
    grupo: p.grupo ?? null,
    posicion_actual:
      p.posicion_actual !== undefined && p.posicion_actual !== null
        ? Number(p.posicion_actual)
        : null,
  }));
}
