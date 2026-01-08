// src/views/Ranking.tsx
import React, { useEffect, useState } from "react";
import { getRanking } from "../services/ranking";
import type { RankingItem } from "../types/ranking";

// Helper para armar "G/P/R"
function formatRecord(item: RankingItem): string {
  return `${item.ganados}/${item.perdidos}/${item.retiros}`;
}

// Chip de cuota (al día / atrasado)
const ChipCuota: React.FC<{ cuota_ok: boolean }> = ({ cuota_ok }) => {
  if (cuota_ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
        ✅ <span>Al día</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
      ⚠️ <span>Atrasado</span>
    </span>
  );
};

// Chip de grupo (A / B / C)
const ChipGrupo: React.FC<{ grupo: string }> = ({ grupo }) => {
  const colores: Record<string, string> = {
    A: "bg-sky-50 text-sky-700 border-sky-100",
    B: "bg-violet-50 text-violet-700 border-violet-100",
    C: "bg-rose-50 text-rose-700 border-rose-100",
  };

  const clase = colores[grupo] ?? "bg-slate-50 text-slate-600 border-slate-100";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${clase}`}
    >
      {grupo}
    </span>
  );
};

const RankingView: React.FC = () => {
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cargarRanking = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getRanking();

      // Ordenamos por posición por las dudas
      const ordenado = [...data].sort(
        (a, b) => a.posicion_actual - b.posicion_actual,
      );

      setItems(ordenado);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("404")) {
        setError("Todavía no hay posiciones calculadas desde el backend (404).");
      } else {
        setError(err?.message || "Error al cargar el ranking.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarRanking();
  }, []);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-100 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Ranking general
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Posiciones actuales por pareja, con récord y cuota. Modelo AppSheet.
          </p>
        </header>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading && (
            <div className="p-4 text-xs text-slate-400">Cargando ranking…</div>
          )}

          {!loading && error && (
            <div className="p-6 text-sm text-center text-red-500">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="p-6 text-sm text-center text-slate-400">
              Aún no hay posiciones cargadas.
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 w-12 text-[11px] font-semibold text-slate-500">
                      N°
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                      Jugadores
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                      Grupo
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                      Récord
                      <span className="ml-1 text-[10px] text-slate-400">
                        (G/P/R)
                      </span>
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-slate-500">
                      Cuota
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((it) => (
                    <tr
                      key={it.id || it.pareja_id}
                      className="border-b border-slate-50 hover:bg-slate-50/70 transition"
                    >
                      <td className="px-4 py-2 text-[12px] text-slate-700">
                        {it.posicion_actual}
                      </td>

                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-medium text-slate-900">
                            {it.nombre_pareja}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Pareja #{it.pareja_id}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-2">
                        <ChipGrupo grupo={it.grupo} />
                      </td>

                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {formatRecord(it)}
                        </span>
                      </td>

                      <td className="px-4 py-2">
                        <ChipCuota cuota_ok={it.cuota_al_dia} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default RankingView;
