// src/services/parejas.ts
import { request } from "./api";
import type { ParejaDesafiable } from "../types/parejas";

/**
 * Trae las parejas desafiables desde el backend.
 * Endpoint: GET /parejas/desafiables
 *
 * ✅ Soporta filtro opcional:
 *   - grupo="Femenino" | "Masculino" (categoría)
 *   - grupo="Femenino A" | "Masculino B" (exacto)
 */
export async function getParejasDesafiables(
  grupo?: string | null
): Promise<ParejaDesafiable[]> {
  const g = (grupo || "").trim();
  const qs = g ? `?grupo=${encodeURIComponent(g)}` : "";

  const data = await request<any[]>(`/parejas/desafiables${qs}`, { method: "GET" });

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
