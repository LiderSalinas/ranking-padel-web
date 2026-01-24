// src/services/ranking.ts
import { request } from "./api";
import type { RankingItem } from "../types/ranking";

// Lo que sea que venga del backend (lo dejamos flexible)
type RankingApiItem = any;

// detecta si el backend ya devuelve EXACTAMENTE lo que queremos
function isRankingItem(x: any): x is RankingItem {
  return (
    x &&
    typeof x === "object" &&
    "nombre_pareja" in x &&
    "pareja_id" in x &&
    "posicion_actual" in x &&
    "grupo" in x
  );
}

function toRankingItem(x: RankingApiItem): RankingItem {
  const nombre =
    x.nombre_pareja ??
    x.jugadores ??
    x.nombre ??
    (x.jugador1_nombre && x.jugador2_nombre
      ? `${x.jugador1_nombre} / ${x.jugador2_nombre}`
      : null) ??
    `Pareja #${x.pareja_id ?? x.id ?? "?"}`;

  return {
    id: Number(x.id ?? x.pareja_id ?? 0),
    pareja_id: Number(x.pareja_id ?? x.id ?? 0),
    nombre_pareja: String(nombre),
    grupo: String(x.grupo ?? ""),
    posicion_actual: Number(x.posicion_actual ?? x.posicion ?? 0),

    ganados: Number(x.ganados ?? 0),
    perdidos: Number(x.perdidos ?? 0),
    retiros: Number(x.retiros ?? 0),

    cuota_al_dia: Boolean(x.cuota_al_dia ?? x.cuota ?? false),
  };
}

export async function getRanking(): Promise<RankingItem[]> {
  const data = await request<RankingApiItem[]>("/ranking/posiciones");
  const arr = data ?? [];

  // si el backend ya trae el shape perfecto, devolvemos directo
  if (arr.length > 0 && arr.every(isRankingItem)) {
    return arr as RankingItem[];
  }

  // fallback flexible
  return arr.map(toRankingItem);
}
