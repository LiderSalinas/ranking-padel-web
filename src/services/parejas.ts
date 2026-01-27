// src/services/parejas.ts
import { request } from "./api";
import type { ParejaDesafiable } from "../types/parejas";

/**
 * ✅ Trae las parejas desafiables desde el backend (ya filtradas por reglas):
 * Endpoint: GET /desafios/parejas-desafiables
 *
 * Reglas aplicadas en backend:
 * - Misma división: solo hasta 3 puestos arriba
 * - Interdivisión: Top 3 B -> últimas 3 A (+ especial 1B->18A)
 * - No cruza Masculino/Femenino
 *
 * Nota: el parámetro `grupo` queda por compat, pero el endpoint ya filtra.
 */
export async function getParejasDesafiables(
  grupo?: string | null
): Promise<ParejaDesafiable[]> {
  // compat: si querés mantener la llamada igual, no rompe
  // (el backend nuevo no usa este filtro)
  const _g = (grupo || "").trim();
  void _g;

  const data = await request<any[]>(`/desafios/parejas-desafiables`, {
    method: "GET",
  });

  const out: ParejaDesafiable[] = [];
  const seen = new Set<number>();

  for (const p of data || []) {
    const idRaw = Number(p?.id);
    const id = Number.isFinite(idRaw) ? idRaw : 0;
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const nombreRaw = String(p?.nombre ?? p?.etiqueta ?? "").trim();
    const nombre = nombreRaw || `Pareja ${id}`;

    const posRaw = p?.posicion_actual;
    const pos =
      posRaw !== undefined && posRaw !== null && Number.isFinite(Number(posRaw))
        ? Number(posRaw)
        : null;

    out.push({
      id,
      nombre,
      grupo: p?.grupo ?? null,
      posicion_actual: pos,
    });
  }

  return out;
}
