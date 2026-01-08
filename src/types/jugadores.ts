export type JugadorCard = {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  foto_url: string | null;
};

export type ParejaCard = {
  pareja_id: number;
  grupo: string;
  posicion_actual: number;
  activo: boolean;

  nombre_pareja: string;

  jugador1: JugadorCard;
  jugador2: JugadorCard;

  partidos_jugados: number;
  victorias: number;
  derrotas: number;
};
