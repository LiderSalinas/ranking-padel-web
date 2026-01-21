// src/CargarResultado.tsx
import React, {
  useState,
  useMemo,
  useEffect,
  type FormEvent,
  type ChangeEvent,
} from "react";
import type { Desafio } from "./types/desafios";
import { cargarResultadoDesafio } from "./services/desafio";

type Props = {
  desafio: Desafio;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const CargarResultado: React.FC<Props> = ({ desafio, onClose, onSaved }) => {
  const [fechaJugado, setFechaJugado] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );

  // Set 1
  const [set1R, setSet1R] = useState("");
  const [set1D, setSet1D] = useState("");

  // Set 2
  const [set2R, setSet2R] = useState("");
  const [set2D, setSet2D] = useState("");

  // Set 3 (Super TB) opcional
  const [set3R, setSet3R] = useState("");
  const [set3D, setSet3D] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ anti doble submit
  const [submitted, setSubmitted] = useState(false);

  const yaJugado =
    String((desafio as any)?.estado ?? "").toLowerCase() === "jugado";

  // ✅ Set 1/2: clamp 0–7
  const handleScoreChangeGames =
    (setter: (v: string) => void) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "") {
        setter("");
        return;
      }
      const n = Number(raw);
      if (Number.isNaN(n)) return;
      const clamped = Math.min(7, Math.max(0, n));
      setter(String(clamped));
    };

  // ✅ Set 3 (Super TB): clamp 0–99 (sin límite 7)
  const handleScoreChangeTB =
    (setter: (v: string) => void) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "") {
        setter("");
        return;
      }
      const n = Number(raw);
      if (Number.isNaN(n)) return;
      const clamped = Math.min(99, Math.max(0, n));
      setter(String(clamped));
    };

  const [nombreRetadora, nombreRetada] = useMemo(() => {
    const titulo = desafio.titulo_desafio ?? "";
    const partes = titulo.split(" VS ");
    const left = (partes[0] ?? "").trim();
    const right = (partes[1] ?? "").trim();
    return [left || "Retador", right || "Desafiado"];
  }, [desafio.titulo_desafio]);

  // Mostrar 3er set solo si hay empate 1–1
  const showSet3 = useMemo(() => {
    const n1R = Number(set1R);
    const n1D = Number(set1D);
    const n2R = Number(set2R);
    const n2D = Number(set2D);

    if (
      Number.isNaN(n1R) ||
      Number.isNaN(n1D) ||
      Number.isNaN(n2R) ||
      Number.isNaN(n2D)
    ) {
      return false;
    }

    const ganoR1 = n1R > n1D;
    const ganoD1 = n1D > n1R;
    const ganoR2 = n2R > n2D;
    const ganoD2 = n2D > n2R;

    return (ganoR1 && ganoD2) || (ganoD1 && ganoR2);
  }, [set1R, set1D, set2R, set2D]);

  useEffect(() => {
    if (!showSet3) {
      setSet3R("");
      setSet3D("");
    }
  }, [showSet3]);

  useEffect(() => {
    setSubmitted(false);
    setErrorMsg(null);
  }, [desafio?.id]);

  const fechaProgramado = (() => {
    try {
      const d = new Date(desafio.fecha);
      const dia = d.getDate().toString().padStart(2, "0");
      const mes = (d.getMonth() + 1).toString().padStart(2, "0");
      const anio = d.getFullYear();
      const hora = desafio.hora.slice(0, 5);
      return `${dia}/${mes}/${anio} · ${hora} hs · ID #${desafio.id}`;
    } catch {
      return `Programado: ${desafio.fecha} · ${desafio.hora} · ID #${desafio.id}`;
    }
  })();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (loading || submitted) return;

    if (yaJugado) {
      setErrorMsg(
        "Este desafío ya está marcado como Jugado. No se puede volver a guardar el resultado.",
      );
      return;
    }

    if (!set1R || !set1D || !set2R || !set2D) {
      setErrorMsg("Completá Set 1 y Set 2 para ambas duplas.");
      return;
    }

    const n1R = Number(set1R);
    const n1D = Number(set1D);
    const n2R = Number(set2R);
    const n2D = Number(set2D);

    if (
      Number.isNaN(n1R) ||
      Number.isNaN(n1D) ||
      Number.isNaN(n2R) ||
      Number.isNaN(n2D)
    ) {
      setErrorMsg("Set 1 y Set 2 deben ser números válidos.");
      return;
    }

    // rango 0–7 set 1 y 2
    if (
      n1R < 0 || n1R > 7 || n1D < 0 || n1D > 7 ||
      n2R < 0 || n2R > 7 || n2D < 0 || n2D > 7
    ) {
      setErrorMsg("Los games de Set 1 y Set 2 deben estar entre 0 y 7.");
      return;
    }

    if (n1R === n1D) {
      setErrorMsg("El Set 1 no puede terminar empatado.");
      return;
    }
    if (n2R === n2D) {
      setErrorMsg("El Set 2 no puede terminar empatado.");
      return;
    }

    // ✅ Set 3 obligatorio si showSet3
    if (showSet3 && (!set3R || !set3D)) {
      setErrorMsg("Como van 1–1, tenés que cargar el Super Tie-Break (Set 3).");
      return;
    }

    const n3R = set3R ? Number(set3R) : null;
    const n3D = set3D ? Number(set3D) : null;

    if ((set3R && Number.isNaN(n3R)) || (set3D && Number.isNaN(n3D))) {
      setErrorMsg("Set 3 (si lo cargás) debe tener números válidos.");
      return;
    }

    // ✅ Super TB: 0–99
    if (
      (n3R !== null && (n3R < 0 || n3R > 99)) ||
      (n3D !== null && (n3D < 0 || n3D > 99))
    ) {
      setErrorMsg("Super Tie-Break: valores entre 0 y 99.");
      return;
    }

    if (showSet3 && n3R !== null && n3D !== null && n3R === n3D) {
      setErrorMsg("El Super Tie-Break no puede terminar empatado.");
      return;
    }

    setLoading(true);
    setSubmitted(true);

    try {
      await cargarResultadoDesafio({
        desafio_id: desafio.id,
        fecha_jugado: fechaJugado,
        set1_retador: n1R,
        set1_desafiado: n1D,
        set2_retador: n2R,
        set2_desafiado: n2D,
        set3_retador: n3R,
        set3_desafiado: n3D,
      });

      await Promise.resolve(onSaved());
      onClose();
    } catch (err: any) {
      console.error(err);
      const detail = err?.detail || err?.message || "No se pudo guardar el resultado.";
      setErrorMsg(detail);
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-900/40 p-3">
      <div className="w-full max-w-lg h-[92vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3 bg-blue-600 text-white">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-sm font-medium hover:text-blue-100"
          >
            ←
          </button>
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs uppercase tracking-wide opacity-80">
              Cargar resultado
            </span>
            <span className="text-[13px] font-semibold truncate">
              {desafio.titulo_desafio}
            </span>
          </div>
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
          id="form-cargar-resultado"
          onSubmit={handleSubmit}
          className="px-5 py-4 space-y-4 overflow-y-auto text-sm min-h-0"
        >
          <section className="border-b border-slate-200 pb-3 space-y-1">
            <p className="text-[11px] text-slate-600 flex gap-1">
              <span>📄</span>
              <span>
                <span className="font-semibold">Cargar resultado para:</span>{" "}
                {desafio.titulo_desafio}
              </span>
            </p>
            <p className="text-[11px] text-slate-500">
              🎾 <span className="font-medium">Retador:</span> {nombreRetadora}
            </p>
            <p className="text-[11px] text-slate-500">
              🎯 <span className="font-medium">Desafiado:</span> {nombreRetada}
            </p>
            <p className="text-[11px] text-slate-400">
              Programado: {fechaProgramado}
            </p>
          </section>

          {/* Fecha jugado */}
          <section className="border-b border-slate-200 pb-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Fecha que se jugó
            </label>
            <input
              type="date"
              value={fechaJugado}
              onChange={(e) => setFechaJugado(e.target.value)}
              className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </section>

          {/* Sets */}
          <section className="space-y-3">
            <p className="text-[11px] text-slate-500">
              Mejor de 3 sets · 3er set = Super Tie-Break (sin límite “7”)
            </p>

            {/* Set 1 */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Set 1</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Retador</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {nombreRetadora}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    step={1}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={set1R}
                    onChange={handleScoreChangeGames(setSet1R)}
                    disabled={loading}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Desafiado</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {nombreRetada}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    step={1}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={set1D}
                    onChange={handleScoreChangeGames(setSet1D)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Set 2 */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Set 2</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Retador</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {nombreRetadora}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    step={1}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={set2R}
                    onChange={handleScoreChangeGames(setSet2R)}
                    disabled={loading}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Desafiado</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {nombreRetada}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    step={1}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={set2D}
                    onChange={handleScoreChangeGames(setSet2D)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Set 3 */}
            {showSet3 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700">
                    Set 3 (Super Tie-Break)
                  </p>
                  <span className="text-[11px] text-slate-400">
                    A 10 (o más si siguen)
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-500">Retador</span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {nombreRetadora}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      step={1}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={set3R}
                      onChange={handleScoreChangeTB(setSet3R)}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-500">Desafiado</span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {nombreRetada}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      step={1}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={set3D}
                      onChange={handleScoreChangeTB(setSet3D)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
        </form>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
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
            onClick={() => {
              const form = document.getElementById("form-cargar-resultado") as HTMLFormElement | null;
              form?.requestSubmit();
            }}
            disabled={loading || yaJugado}
            className="rounded-full bg-blue-600 px-5 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-700 disabled:opacity-60"
          >
            {yaJugado ? "Ya cargado" : loading ? "Guardando..." : "Guardar resultado"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CargarResultado;
