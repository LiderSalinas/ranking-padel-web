// src/types/parejas.ts

// Pareja básica (la que viene en listados normales de parejas)
export interface Pareja {
  id: number;
  nombre: string;            // nombre de la pareja (o título que uses)
  grupo?: string | null;     // opcional, por si lo necesitás
}

// Pareja que se puede usar para crear desafíos
// (la que devuelve el endpoint /parejas/desafiables)
export interface ParejaDesafiable extends Pareja {
  posicion_actual: number | null; // posición en el ranking, puede venir null
}
