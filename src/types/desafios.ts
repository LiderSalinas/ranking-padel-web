// src/types/desafios.ts

export type EstadoDesafio = "Pendiente" | "Aceptado" | "Rechazado" | "Jugado";

export interface Desafio {
  id: number;

  retadora_pareja_id: number;
  retada_pareja_id: number;

  ganador_pareja_id: number | null;

  estado: EstadoDesafio;

  fecha: string; // "YYYY-MM-DD"
  hora: string;  // "HH:MM:SS" (redonda)

  observacion: string | null;

  // flags / tracking
  limite_semana_ok: boolean;
  swap_aplicado: boolean;
  pos_retadora_old: number | null;
  pos_retada_old: number | null;
  ranking_aplicado: boolean;

  titulo_desafio: string;

  // timestamps
  created_at: string;
  updated_at: string;

  // ✅ calculado (no necesariamente viene siempre)
  puesto_en_juego?: number | null;

  // ✅ resultado (guardado en BD)
  fecha_jugado?: string | null;

  set1_retador?: number | null;
  set1_desafiado?: number | null;

  set2_retador?: number | null;
  set2_desafiado?: number | null;

  set3_retador?: number | null;
  set3_desafiado?: number | null;

  // ⚠️ Estos NO existen en tu backend actual: los dejo opcionales por compat
  resultado_cargado_por?: string | null;
  resultado_cargado_at?: string | null;
}
