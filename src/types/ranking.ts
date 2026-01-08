// src/types/ranking.ts
export interface RankingItem {
  id: number;              // id del registro en el ranking
  pareja_id: number;       // id de la pareja
  nombre_pareja: string;   // "Rene Duarte / Marcos de Asis"
  grupo: string;           // "A", "B", etc.
  posicion_actual: number; // posición en el ranking

  ganados: number;
  perdidos: number;
  retiros: number;

  cuota_al_dia: boolean;   // true = ✅, false = ⚠️
}
