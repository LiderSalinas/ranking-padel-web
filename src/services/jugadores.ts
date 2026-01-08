import { request } from "./api";
import type { ParejaCard } from "../types/jugadores";

type ApiItem = any;

function toParejaCard(x: ApiItem): ParejaCard {
  return {
    pareja_id: Number(x.pareja_id ?? x.id ?? 0),
    grupo: String(x.grupo ?? ""),
    posicion_actual: Number(x.posicion_actual ?? 0),
    activo: Boolean(x.activo ?? true),

    nombre_pareja: String(x.nombre_pareja ?? x.nombre ?? "Pareja"),

    jugador1: {
      id: Number(x.jugador1?.id ?? x.jugador1_id ?? 0),
      nombre: String(x.jugador1?.nombre ?? ""),
      apellido: String(x.jugador1?.apellido ?? ""),
      telefono: String(x.jugador1?.telefono ?? ""),
      email: String(x.jugador1?.email ?? ""),
      foto_url: (x.jugador1?.foto_url ?? null) as string | null,
    },
    jugador2: {
      id: Number(x.jugador2?.id ?? x.jugador2_id ?? 0),
      nombre: String(x.jugador2?.nombre ?? ""),
      apellido: String(x.jugador2?.apellido ?? ""),
      telefono: String(x.jugador2?.telefono ?? ""),
      email: String(x.jugador2?.email ?? ""),
      foto_url: (x.jugador2?.foto_url ?? null) as string | null,
    },

    partidos_jugados: Number(x.partidos_jugados ?? 0),
    victorias: Number(x.victorias ?? 0),
    derrotas: Number(x.derrotas ?? 0),
  };
}

/**
 * ✅ Cambiá esta ruta por la tuya real
 * Si tu backend ya devuelve el JSON que pegaste, apuntá acá:
 *  - "/parejas/cards"   (recomendado)
 *  - o "/parejas/listado-cards"
 *  - o el endpoint que ya tengas
 */
export async function getParejasCards(): Promise<ParejaCard[]> {
  const data = await request<ApiItem[]>("/parejas/cards");
  return (data ?? []).map(toParejaCard);
}
