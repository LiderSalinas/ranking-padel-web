import React, { useEffect, useMemo, useState } from "react";
import { getParejasCards } from "../services/jugadores";
import type { ParejaCard } from "../types/jugadores";

type Props = {
  onLogout: () => void;
};

function initials(nombre: string, apellido: string) {
  const a = (nombre?.trim()?.[0] ?? "").toUpperCase();
  const b = (apellido?.trim()?.[0] ?? "").toUpperCase();
  return `${a}${b}` || "👤";
}

function waLink(phone: string, text: string) {
  const digits = (phone || "").replace(/[^\d]/g, "");
  const msg = encodeURIComponent(text);
  // Si tus números son de PY y querés forzar +595, podemos mejorarlo luego.
  return digits ? `https://wa.me/${digits}?text=${msg}` : `https://wa.me/?text=${msg}`;
}

const ChipGrupo: React.FC<{ grupo: string }> = ({ grupo }) => {
  const colores: Record<string, string> = {
    A: "bg-sky-50 text-sky-700 border-sky-100",
    B: "bg-violet-50 text-violet-700 border-violet-100",
    C: "bg-rose-50 text-rose-700 border-rose-100",
  };
  const clase = colores[grupo] ?? "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${clase}`}>
      Grupo {grupo || "-"}
    </span>
  );
};

const JugadoresView: React.FC<Props> = ({ onLogout }) => {
  const [items, setItems] = useState<ParejaCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtros AppSheet-like (simple)
  const [grupo, setGrupo] = useState<string>("ALL");
  const [q, setQ] = useState<string>("");

  const cargar = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getParejasCards();

      // orden AppSheet: grupo + posicion
      const ordenado = [...data].sort((a, b) => {
        const g = String(a.grupo).localeCompare(String(b.grupo));
        if (g !== 0) return g;
        return a.posicion_actual - b.posicion_actual;
      });

      setItems(ordenado);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudo cargar Jugadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();

    return items.filter((p) => {
      const okGrupo = grupo === "ALL" ? true : p.grupo === grupo;

      if (!term) return okGrupo;

      const hay =
        p.nombre_pareja.toLowerCase().includes(term) ||
        `${p.jugador1.nombre} ${p.jugador1.apellido}`.toLowerCase().includes(term) ||
        `${p.jugador2.nombre} ${p.jugador2.apellido}`.toLowerCase().includes(term);

      return okGrupo && hay;
    });
  }, [items, grupo, q]);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-100 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* HEADER */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Jugadores</h2>
            <p className="text-xs text-slate-500 mt-1">
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800 active:scale-[0.96] transition"
            title="Salir"
          >
            <span className="text-lg">🚪</span>
          </button>
        </header>

        {/* Filtros */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Grupo</label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
              >
                <option value="ALL">Todos</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar jugador o pareja…"
              className="w-full sm:w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-300"
            />
          </div>
        </section>

        {/* LISTA */}
        <section className="space-y-3">
          {loading && (
            <div className="p-4 text-xs text-slate-400">Cargando parejas…</div>
          )}

          {!loading && error && (
            <div className="bg-white rounded-2xl border border-red-100 p-5 text-sm text-red-500 text-center">
              {error}
              <div className="mt-3">
                <button
                  onClick={() => void cargar()}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {!loading && !error && filtrados.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-sm text-slate-400 text-center">
              No hay parejas para mostrar.
            </div>
          )}

          {!loading && !error && filtrados.map((p) => {
            const j1 = p.jugador1;
            const j2 = p.jugador2;

            const foto1 = j1.foto_url;
            const foto2 = j2.foto_url;

            const tituloWA = `Hola! 👋 Somos la pareja ${p.nombre_pareja}.`;

            return (
              <article
                key={p.pareja_id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
              >
                {/* top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatars estilo AppSheet */}
                    <div className="relative flex -space-x-2">
                      <div className="h-12 w-12 rounded-full ring-2 ring-white bg-slate-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-700">
                        {foto1 ? (
                          <img src={foto1} alt="Jugador 1" className="h-full w-full object-cover" />
                        ) : (
                          initials(j1.nombre, j1.apellido)
                        )}
                      </div>
                      <div className="h-12 w-12 rounded-full ring-2 ring-white bg-slate-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-700">
                        {foto2 ? (
                          <img src={foto2} alt="Jugador 2" className="h-full w-full object-cover" />
                        ) : (
                          initials(j2.nombre, j2.apellido)
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-slate-900">
                        {p.nombre_pareja}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Pareja #{p.pareja_id} · Posición {p.posicion_actual}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ChipGrupo grupo={p.grupo} />
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.activo ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </div>

                {/* stats row */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-[10px] text-slate-500">Partidos</div>
                    <div className="text-sm font-semibold">{p.partidos_jugados}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-[10px] text-slate-500">Victorias</div>
                    <div className="text-sm font-semibold">{p.victorias}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <div className="text-[10px] text-slate-500">Derrotas</div>
                    <div className="text-sm font-semibold">{p.derrotas}</div>
                  </div>
                </div>

                {/* actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    className="rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-emerald-700"
                    href={waLink(j1.telefono, tituloWA)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp J1
                  </a>
                  <a
                    className="rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-medium text-white hover:bg-emerald-700"
                    href={waLink(j2.telefono, tituloWA)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp J2
                  </a>

                  {/* placeholders para cuando conectemos */}
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      // después: navegar a detalle /parejas/:id
                      alert(`Detalle de pareja #${p.pareja_id} (lo conectamos después)`);
                    }}
                  >
                    Ver detalle
                  </button>

                  <button
                    type="button"
                    className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      // después: navegar a historial
                      alert(`Historial de pareja #${p.pareja_id} (lo conectamos después)`);
                    }}
                  >
                    Historial
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
};

export default JugadoresView;
