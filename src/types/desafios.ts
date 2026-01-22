// src/types/desafios.ts

export type EstadoDesafio = "Pendiente" | "Aceptado" | "Rechazado" | "Jugado";

export interface Desafio {
  id: number;

  retadora_pareja_id: number;
  retada_pareja_id: number;

  fecha: string; // "YYYY-MM-DD"
  hora: string;  // "HH:MM:SS" (SIEMPRE redonda)

  observacion: string | null;
  estado: EstadoDesafio;

  limite_semana_ok: boolean;
  swap_aplicado: boolean;
  pos_retadora_old: number | null;
  pos_retada_old: number | null;
  ranking_aplicado: boolean;

  titulo_desafio: string;
  ganador_pareja_id: number | null;

  created_at: string;
  updated_at: string;

  puesto_en_juego?: number | null;

  // detalle / historial
  fecha_jugado?: string | null;

  set1_retador?: number | null;
  set1_desafiado?: number | null;

  set2_retador?: number | null;
  set2_desafiado?: number | null;

  set3_retador?: number | null;
  set3_desafiado?: number | null;

  resultado_cargado_por?: string | null;
  resultado_cargado_at?: string | null;
}
