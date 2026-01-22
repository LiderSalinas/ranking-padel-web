// src/CrearDesafio.tsx
import React, {
  useState,
  useMemo,
  type FormEvent,
  type ChangeEvent,
} from "react";
import type { Pareja } from "./types/parejas";
import { crearDesafio } from "./services/desafio";

type Props = {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  parejas?: Pareja[];
};

function buildHorasRedondas(): string[] {
  // "00:00" .. "23:00"
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  return out;
}

const CrearDesafio: React.FC<Props> = ({ onClose, onCreated, parejas = [] }) => {
  const [retadoraId, setRetadoraId] = useState<string>("");
  const [retadaId, setRetadaId] = useState<string>("");

  const [fecha, setFecha] = useState<string>("");
  const [hora, setHora] = useState<string>(""); // ahora guardamos "HH:00"
  const [observacion, setObservacion] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const horasRedondas = useMemo(() => buildHorasRedondas(), []);

  // Mantengo el orden que venga
  const parejasOrdenadas = useMemo(() => parejas, [parejas]);

  // Lista para el combo de RETADA: excluye a la retadora
  const parejasParaRetada = useMemo(
    () => parejasOrdenadas.filter((p) => String(p.id) !== retadoraId),
    [parejasOrdenadas, retadoraId],
  );

  const handleChangeRetadora = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRetadoraId(value);
    // Al cambiar retadora, limpiamos la retada
    setRetadaId("");
  };

  const handleChangeRetada = (e: ChangeEvent<HTMLSelectElement>) => {
    setRetadaId(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!retadoraId || !retadaId) {
      setErrorMsg("Seleccioná la pareja retadora y la pareja retada.");
      return;
    }

    const idR = Number(retadoraId);
    const idD = Number(retadaId);

    if (Number.isNaN(idR) || Number.isNaN(idD)) {
      setErrorMsg("No se pudo obtener el ID de las parejas.");
      return;
    }

    if (idR === idD) {
      setErrorMsg("La pareja retadora y la pareja retada deben ser distintas.");
      return;
    }

    if (!fecha) {
      setErrorMsg("Seleccioná la fecha del desafío.");
      return;
    }

    if (!hora) {
      setErrorMsg("Seleccioná la hora del desafío (solo horas redondas).");
      return;
    }

    setLoading(true);

    try {
      await crearDesafio({
        retadora_pareja_id: idR,
        retada_pareja_id: idD,
        fecha,
        // mandamos HH:00 (el service ya lo redondea igual)
        hora,
        observacion: observacion || "Partido de prueba desde panel",
      });

      await Promise.resolve(onCreated());
      onClose();
    } catch (err: any) {
      console.error(err);
      const detail =
        err?.detail || err?.message || "No se pudo crear el desafío.";
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40">
      <div className="w-full max-w-xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* HEADER AZUL */}
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600 text-white rounded-t-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-sm font-medium hover:text-blue-100"
          >
            ←
          </button>
          <span className="text-sm font-semibold">Nuevo desafío</span>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-xs font-medium hover:text-blue-100"
          >
            Cerrar
          </button>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="px-5 py-4 space-y-4 overflow-y-auto text-sm"
        >
          {/* Parejas */}
          <section className="space-y-3">
            <div className="flex gap-3">
              {/* Retadora */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Dupla retadora
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={retadoraId}
                  onChange={handleChangeRetadora}
                  disabled={loading}
                >
                  <option value="">Seleccionar...</option>
                  {parejasOrdenadas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Retada */}
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Dupla desafiada
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={retadaId}
                  onChange={handleChangeRetada}
                  disabled={loading || !retadoraId}
                >
                  <option value="">Seleccionar...</option>
                  {parejasParaRetada.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Fecha y hora */}
          <section className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Hora (solo horas redondas)
              </label>

              {/* ✅ ACÁ está la corrección real: select de horas redondas */}
              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Seleccionar...</option>
                {horasRedondas.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Observación */}
          <section>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Observación
            </label>
            <textarea
              rows={3}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej: Partido de prueba desde panel"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </section>

          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
        </form>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => {
              const form = (e.currentTarget.closest(
                ".flex.flex-col",
              ) as HTMLElement)?.querySelector("form") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            disabled={loading}
            className="rounded-full bg-blue-600 px-5 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear desafío"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearDesafio;
