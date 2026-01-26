// src/types/parejas.ts

// Pareja básica
export interface Pareja {
  id: number;
  nombre: string;
  grupo?: string | null;
}

// Pareja que se puede usar para crear desafíos
export interface ParejaDesafiable extends Pareja {
  posicion_actual: number | null;
}
