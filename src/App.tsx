// src/App.tsx
import React, { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import type { Desafio } from "./types/desafios";
import type { ParejaDesafiable } from "./types/parejas";

import {
  getMisProximosDesafios,
  getDesafioById, // ✅ nuevo
  crearDesafio,
  aceptarDesafio,
  rechazarDesafio,
} from "./services/desafio";
import { getParejasDesafiables } from "./services/parejas";
import Login from "./views/Auth/Login";
import { logout } from "./services/auth";
import CargarResultado from "./CargarResultado";
import RankingView from "./views/Ranking";
import JugadoresView from "./views/Jugadores";

import {
  activarNotificacionesYGuardar,
  listenForegroundPush,
  tryAutoRegisterPush,
  setOnForegroundToast, // ✅ NUEVO
} from "./push";

import ForegroundToast from "./components/ForegroundToast"; // ✅ NUEVO

// Helper chiquito para mostrar 1/12, etc.
function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    const dia = d.getDate().toString();
    const mes = (d.getMonth() + 1).toString();
    return `${dia}/${mes}`;
  } catch {
    return iso;
  }
}

// ✅ Nuevo: formatea ISO "YYYY-MM-DDTHH:mm:ssZ" o similar a "dd/mm/yyyy – HH:MM"
function formatFechaHora(iso: string): string {
  try {
    const d = new Date(iso);
    const dia = d.getDate().toString().padStart(2, "0");
    const mes = (d.getMonth() + 1).toString().padStart(2, "0");
    const anio = d.getFullYear().toString();
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return `${dia}/${mes}/${anio} – ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

// ✅ Nuevo: arma un ISO a partir de fecha "YYYY-MM-DD" + hora "HH:MM:SS"
function joinFechaHoraIso(fecha: string, hora: string): string {
  // ojo: sin timezone; igual sirve para mostrar algo coherente
  const h = (hora || "00:00:00").slice(0, 8);
  return `${fecha}T${h}`;
}

type Estado = Desafio["estado"];

const BadgeEstado: React.FC<{ estado: Estado }> = ({ estado }) => {
  const base = "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold";

  const classes: Record<Estado, string> = {
    Pendiente: "bg-red-100 text-red-700",
    Aceptado: "bg-sky-100 text-sky-700",
    Rechazado: "bg-orange-100 text-orange-700",
    Jugado: "bg-emerald-100 text-emerald-700",
  };

  const label = estado === "Jugado" ? "🏆 Jugado" : estado;
  return <span className={`${base} ${classes[estado]}`}>{label}</span>;
};

type TabId = "desafiosMasculinos" | "ranking" | "jugadores" | "desafiosFemeninos";

// -------------------- VISTA PRINCIPAL (DESAFÍOS) --------------------
const DesafiosView: React.FC<{
  onLogout: () => void;
  headerTitle: string;
  headerSubtitle: string;
  openDesafioId?: number | null;
  clearOpenDesafio?: () => void;
}> = ({ onLogout, headerTitle, headerSubtitle, openDesafioId, clearOpenDesafio }) => {
  const [items, setItems] = useState<Desafio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [parejas, setParejas] = useState<ParejaDesafiable[]>([]);

  const [showCrear, setShowCrear] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formCrear, setFormCrear] = useState({
    retadora_pareja_id: "",
    retada_pareja_id: "",
    fecha: "",
    hora: "",
    observacion: "",
  });

  const [desafioSeleccionado, setDesafioSeleccionado] = useState<Desafio | null>(null);

  const [desafioDetalle, setDesafioDetalle] = useState<Desafio | null>(null);
  const openHandledRef = useRef<number | null>(null);

  const cargarDesafios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMisProximosDesafios();
      setItems(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al cargar desafíos");
    } finally {
      setLoading(false);
    }
  };

  const cargarParejas = async () => {
    try {
      const data = await getParejasDesafiables();
      setParejas(data);
    } catch (err) {
      console.error("Error cargando parejas desafiables", err);
    }
  };

  useEffect(() => {
    void cargarDesafios();
    void cargarParejas();
  }, []);

  // ✅ Abrir desafío desde notificación:
  // - si no está en items, lo buscamos por ID (GET /desafios/{id}) y abrimos igual
  useEffect(() => {
    if (!openDesafioId) return;
    if (openHandledRef.current === openDesafioId) return;

    const found = items.find((x) => x.id === openDesafioId);
    if (found) {
      openHandledRef.current = openDesafioId;
      setDesafioDetalle(found);
      clearOpenDesafio?.();
      return;
    }

    // si todavía está cargando lista, esperamos
    if (loading) return;

    // ✅ Ya cargó lista y no apareció: fetch por ID
    (async () => {
      try {
        openHandledRef.current = openDesafioId;

        const d = await getDesafioById(openDesafioId);

        // opcional: lo “inyectamos” arriba en items para que quede visible
        setItems((prev) => {
          const exists = prev.some((x) => x.id === d.id);
          return exists ? prev : [d, ...prev];
        });

        setDesafioDetalle(d);
      } catch (e: any) {
        alert(e?.message || "No se pudo abrir el desafío (no visible o sin permiso).");
      } finally {
        clearOpenDesafio?.();
      }
    })();
  }, [openDesafioId, items, loading, clearOpenDesafio]);

  const opcionesParejas = useMemo(
    () =>
      parejas.map((p) => ({
        value: String(p.id),
        label: (p as any).etiqueta ?? (p as any).nombre ?? `Pareja ${p.id}`,
      })),
    [parejas]
  );

  const mapaParejas = useMemo(() => {
    const map = new Map<number, string>();
    parejas.forEach((p) => {
      const label = (p as any).etiqueta ?? (p as any).nombre ?? `Pareja ${p.id}`;
      map.set(p.id, label);
    });
    return map;
  }, [parejas]);

  const construirTituloDesafio = (d: Desafio): string => {
    const retadora = mapaParejas.get(d.retadora_pareja_id);
    const retada = mapaParejas.get(d.retada_pareja_id);

    if (retadora && retada) return `${retadora} VS ${retada}`;
    if (d.titulo_desafio && d.titulo_desafio.trim() !== "") return d.titulo_desafio;

    return `${d.retadora_pareja_id} vs ${d.retada_pareja_id}`;
  };

  // ✅ Nuevo: etiquetas por DÚO para cualquier id
  const labelPareja = (id: number | null | undefined): string => {
    if (!id) return "—";
    return mapaParejas.get(id) ?? `Pareja ${id}`;
  };

  const handleCrearChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormCrear((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitCrear = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      if (!formCrear.retadora_pareja_id || !formCrear.retada_pareja_id) {
        throw new Error("Seleccioná las dos parejas.");
      }
      if (!formCrear.fecha || !formCrear.hora) {
        throw new Error("Completá fecha y hora.");
      }

      await crearDesafio({
        retadora_pareja_id: Number(formCrear.retadora_pareja_id),
        retada_pareja_id: Number(formCrear.retada_pareja_id),
        fecha: formCrear.fecha,
        hora: formCrear.hora,
        observacion: formCrear.observacion || undefined,
      });

      setShowCrear(false);
      setFormCrear({
        retadora_pareja_id: "",
        retada_pareja_id: "",
        fecha: "",
        hora: "",
        observacion: "",
      });

      await cargarDesafios();
    } catch (err: any) {
      console.error(err);
      const detail = err?.detail || err?.message;
      setError(detail || "No se pudo crear el desafío");
    } finally {
      setCreating(false);
    }
  };

  const handleAceptar = async (id: number) => {
    try {
      setError(null);
      await aceptarDesafio(id);
      await cargarDesafios();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo aceptar el desafío");
    }
  };

  const handleRechazar = async (id: number) => {
    try {
      setError(null);
      await rechazarDesafio(id);
      await cargarDesafios();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo rechazar el desafío");
    }
  };

  const abrirModalResultado = (d: Desafio) => {
    const tituloUI = construirTituloDesafio(d);
    const copia = { ...d, titulo_desafio: tituloUI };
    setDesafioSeleccionado(copia);
  };

  const cerrarDetalle = () => setDesafioDetalle(null);

  const parejaRetadoraSeleccionada = parejas.find(
    (p) => String(p.id) === formCrear.retadora_pareja_id
  );
  const parejaRetadaSeleccionada = parejas.find((p) => String(p.id) === formCrear.retada_pareja_id);

  const etiquetaRetadora =
    parejaRetadoraSeleccionada &&
    ((parejaRetadoraSeleccionada as any).etiqueta ??
      (parejaRetadoraSeleccionada as any).nombre ??
      `Pareja ${parejaRetadoraSeleccionada.id}`);

  const etiquetaRetada =
    parejaRetadaSeleccionada &&
    ((parejaRetadaSeleccionada as any).etiqueta ??
      (parejaRetadaSeleccionada as any).nombre ??
      `Pareja ${parejaRetadaSeleccionada.id}`);

  const puestoEnJuego =
    parejaRetadoraSeleccionada && parejaRetadaSeleccionada
      ? Math.min(
          (parejaRetadoraSeleccionada as any).posicion ?? 0,
          (parejaRetadaSeleccionada as any).posicion ?? 0
        )
      : null;

  // ✅ Nuevo: helpers de resultado/sets (no rompen si no vienen los campos)
  const getSets = (d: Desafio) => {
    const s1r = (d as any).set1_retador;
    const s1d = (d as any).set1_desafiado;
    const s2r = (d as any).set2_retador;
    const s2d = (d as any).set2_desafiado;
    const s3r = (d as any).set3_retador;
    const s3d = (d as any).set3_desafiado;

    const has1 = Number.isFinite(s1r) && Number.isFinite(s1d);
    const has2 = Number.isFinite(s2r) && Number.isFinite(s2d);
    const has3 = (s3r !== null && s3r !== undefined) || (s3d !== null && s3d !== undefined);

    if (!has1 && !has2 && !has3) return null;

    return {
      set1: has1 ? { r: s1r, d: s1d } : null,
      set2: has2 ? { r: s2r, d: s2d } : null,
      set3: has3 ? { r: s3r ?? null, d: s3d ?? null } : null,
    };
  };

  // ✅ Nuevo: fecha jugado
  const getFechaJugadoLabel = (d: Desafio) => {
    const fj = (d as any).fecha_jugado as string | undefined;
    if (fj && fj.trim()) return formatFechaHora(fj);

    // fallback: si no existe, mostramos la programada
    const iso = joinFechaHoraIso(d.fecha, d.hora);
    return formatFechaHora(iso);
  };

  // ✅ Nuevo: cálculo de cambio de posiciones por DÚO usando old + swap_aplicado
  const getCambioPosiciones = (d: Desafio) => {
    const oldR = d.pos_retadora_old;
    const oldD = d.pos_retada_old;

    if (oldR == null || oldD == null) return null;

    // si swap aplicado => se intercambian posiciones
    if (d.swap_aplicado) {
      return {
        retadora: { old: oldR, new: oldD },
        retada: { old: oldD, new: oldR },
      };
    }

    // si no swap, se mantienen (igual mostramos si querés histórico)
    return {
      retadora: { old: oldR, new: oldR },
      retada: { old: oldD, new: oldD },
    };
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {headerTitle}
            </h1>
            <p className="text-[13px] text-slate-500 leading-snug">{headerSubtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* ✅ Botón notificaciones: ahora ACTIVA acá mismo si hace falta */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const r = await tryAutoRegisterPush();

                  // ✅ Ya listo / ya registrado
                  if (r.ok || r.reason === "already_registered") {
                    alert("✅ Notificaciones ya estaban listas.");
                    return;
                  }

                  // ❌ No soporta (iPhone en WhatsApp/IG / navegador raro)
                  if (r.reason === "unsupported") {
                    alert(r.message || "Este navegador no soporta notificaciones. Abrí en Safari/Chrome.");
                    return;
                  }

                  // ❌ Denegado: el usuario bloqueó notificaciones
                  if (r.reason === "denied") {
                    alert(
                      "⚠️ Tenés bloqueadas las notificaciones.\n\n" +
                        "iPhone: Ajustes > Notificaciones > (Safari/PWA)\n" +
                        "Android: Configuración del sitio > Notificaciones"
                    );
                    return;
                  }

                  // ✅ Necesita permiso => activamos acá mismo
                  if (r.reason === "need_permission") {
                    await activarNotificacionesYGuardar();
                    alert("✅ Notificaciones activadas");
                    return;
                  }

                  // No session (raro porque estás logueado, pero por las dudas)
                  if (r.reason === "no_session") {
                    alert("⚠️ No hay sesión activa. Volvé a loguearte.");
                    return;
                  }

                  // fallback
                  alert(r.message || "No se pudo activar/verificar notificaciones.");
                } catch (e: any) {
                  alert(e?.message || "Error verificando/activando notificaciones");
                }
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-[0.96] transition"
              title="Notificaciones"
            >
              <span className="text-xl">🔔</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCrear(true)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-[0.96] transition"
              title="Nuevo desafío"
            >
              <span className="text-xl">⚔️</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-white shadow-md hover:bg-slate-900 active:scale-[0.96] transition"
              title="Cerrar sesión"
            >
              <span className="text-xl">🚪</span>
            </button>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm p-6 mt-2">
          <h2 className="text-lg font-semibold text-center">Mis próximos desafíos</h2>
          <p className="text-xs text-center text-slate-500 mt-1">
            Se muestran desafíos con estado Pendiente / Aceptado para el jugador autenticado.
          </p>

          <div className="mt-6 space-y-3">
            {loading && <p className="text-xs text-slate-400">Cargando desafíos…</p>}

            {!loading && error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            {!loading && !error && items.length === 0 && (
              <p className="text-sm text-slate-400 text-center">No tenés desafíos próximos.</p>
            )}

            {!loading &&
              !error &&
              items.map((d) => {
                const tituloUI = construirTituloDesafio(d);

                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="text-[13px] font-semibold mb-1">{tituloUI}</h3>

                      <p className="text-[11px] text-slate-500">
                        {formatFecha(d.fecha)} · {d.hora.slice(0, 5)}
                      </p>

                      {d.observacion && (
                        <p className="text-[11px] text-slate-500 mt-1">{d.observacion}</p>
                      )}

                      {d.estado === "Jugado" && (
                        <p className="text-[11px] text-emerald-700 mt-1">🏅 Resultado cargado</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <BadgeEstado estado={d.estado} />

                      <div className="flex flex-wrap justify-end gap-2">
                        {d.estado === "Pendiente" && (
                          <>
                            <button
                              onClick={() => handleAceptar(d.id)}
                              className="rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-700"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleRechazar(d.id)}
                              className="rounded-full border border-orange-300 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
                            >
                              Rechazar
                            </button>
                          </>
                        )}

                        {d.estado === "Aceptado" && (
                          <>
                            <button
                              onClick={() => abrirModalResultado(d)}
                              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              Cargar resultado
                            </button>
                            <button
                              onClick={() => handleRechazar(d.id)}
                              className="rounded-full border border-orange-300 px-3 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50"
                            >
                              Rechazar
                            </button>
                          </>
                        )}

                        {d.estado === "Rechazado" && (
                          <span className="text-[11px] text-slate-400">Desafío rechazado</span>
                        )}

                        {d.estado === "Jugado" && (
                          <span className="text-[11px] text-emerald-700">Partido jugado</span>
                        )}

                        {/* ✅ CAMBIO ÚNICO: ahora dispara GET /desafios/{id} para traer detalle completo */}
                        <button
                          onClick={async () => {
                            // 1) Abrimos rápido con lo que ya tenemos
                            setDesafioDetalle(d);

                            // 2) Traemos detalle completo (sets, fecha_jugado, etc.)
                            try {
                              const full = await getDesafioById(d.id);
                              setDesafioDetalle(full);
                            } catch (e) {
                              console.warn("No se pudo traer detalle completo del desafío", e);
                            }
                          }}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      {/* ✅ Modal DETALLE (mejorado, sin romper nada) */}
      {desafioDetalle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-semibold">Detalle del partido</h3>

                {/* subheader tipo “Jugado: …” */}
                <p className="text-xs text-slate-500 mt-1">
                  Jugado: {getFechaJugadoLabel(desafioDetalle)}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarDetalle}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            {/* Estado + ID */}
            <div className="flex items-center justify-between mb-4">
              <BadgeEstado estado={desafioDetalle.estado} />
              <span className="text-[11px] text-slate-400">ID: {desafioDetalle.id}</span>
            </div>

            {/* Equipos + ganador (por DÚOS) */}
            <div className="space-y-2 mb-4">
              {desafioDetalle.estado === "Jugado" && desafioDetalle.ganador_pareja_id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Ganador</p>
                    <p className="text-lg font-semibold text-emerald-700">
                      {labelPareja(desafioDetalle.ganador_pareja_id)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎾</span>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Desafío</p>
                    <p className="text-[13px] font-semibold">
                      {construirTituloDesafio(desafioDetalle)}
                    </p>
                  </div>
                </div>
              )}

              {/* VS (siempre por dúos) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[13px] font-semibold">
                  {labelPareja(desafioDetalle.retadora_pareja_id)}
                </p>
                <p className="text-xs text-slate-400 my-1 text-center">VS</p>
                <p className="text-[13px] font-semibold">
                  {labelPareja(desafioDetalle.retada_pareja_id)}
                </p>
              </div>
            </div>

            {/* Observación (si hay) */}
            {desafioDetalle.observacion && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 mb-4">
                {desafioDetalle.observacion}
              </div>
            )}

            {/* Resultado (sets) */}
            <div className="mb-4">
              <p className="text-[13px] font-semibold mb-2">Resultado</p>

              {(() => {
                const sets = getSets(desafioDetalle);
                if (!sets) {
                  return (
                    <p className="text-xs text-slate-400">
                      Resultado no disponible (sets no presentes en el payload).
                    </p>
                  );
                }

                const lines: Array<{ label: string; r: any; d: any }> = [];

                if (sets.set1) lines.push({ label: "Set 1", r: sets.set1.r, d: sets.set1.d });
                if (sets.set2) lines.push({ label: "Set 2", r: sets.set2.r, d: sets.set2.d });

                if (sets.set3) {
                  // si set3 viene como null/null, lo ocultamos
                  const r = sets.set3.r;
                  const d = sets.set3.d;
                  const has = r !== null || d !== null;
                  if (has) lines.push({ label: "Super TB", r, d });
                }

                return (
                  <div className="space-y-1 text-[12px] text-slate-700">
                    {lines.map((x) => (
                      <div key={x.label} className="flex items-center justify-between">
                        <span className="text-slate-500">{x.label}:</span>
                        <span className="font-semibold">
                          {x.r ?? "—"} – {x.d ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Cambio de posiciones (por DÚOS) */}
            <div className="mb-4">
              <p className="text-[13px] font-semibold mb-2">Cambio de posiciones</p>

              {(() => {
                const cambio = getCambioPosiciones(desafioDetalle);
                if (!cambio) {
                  return (
                    <p className="text-xs text-slate-400">
                      No hay datos de posiciones previas para este desafío.
                    </p>
                  );
                }

                const upOrDown = (oldPos: number, newPos: number) => {
                  if (newPos < oldPos) return { icon: "⬆️", cls: "text-emerald-700" };
                  if (newPos > oldPos) return { icon: "⬇️", cls: "text-red-600" };
                  return { icon: "➡️", cls: "text-slate-500" };
                };

                const a = upOrDown(cambio.retadora.old, cambio.retadora.new);
                const b = upOrDown(cambio.retada.old, cambio.retada.new);

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-700">
                        {labelPareja(desafioDetalle.retadora_pareja_id)}
                      </span>
                      <span className={`font-semibold ${a.cls}`}>
                        #{cambio.retadora.old} {a.icon} #{cambio.retadora.new}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-700">
                        {labelPareja(desafioDetalle.retada_pareja_id)}
                      </span>
                      <span className={`font-semibold ${b.cls}`}>
                        #{cambio.retada.old} {b.icon} #{cambio.retada.new}
                      </span>
                    </div>

                    {/* mini info técnica */}
                    <p className="text-[11px] text-slate-400">
                      Swap aplicado: {desafioDetalle.swap_aplicado ? "Sí" : "No"} · Ranking aplicado:{" "}
                      {desafioDetalle.ranking_aplicado ? "Sí" : "No"}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Bloque admin / control */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-4">
              <p className="text-[12px] font-semibold text-slate-700 mb-2">Estado del desafío</p>
              <div className="space-y-1 text-[12px] text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estado:</span>
                  <span className="font-semibold">{desafioDetalle.estado}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ganador (pareja):</span>
                  <span className="font-semibold">
                    {desafioDetalle.ganador_pareja_id
                      ? labelPareja(desafioDetalle.ganador_pareja_id)
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Última actualización:</span>
                  <span className="font-semibold">{formatFechaHora(desafioDetalle.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Acciones (intacto) */}
            <div className="flex flex-wrap gap-2 justify-end">
              {desafioDetalle.estado === "Pendiente" && (
                <>
                  <button
                    onClick={async () => {
                      await handleAceptar(desafioDetalle.id);
                      cerrarDetalle();
                    }}
                    className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={async () => {
                      await handleRechazar(desafioDetalle.id);
                      cerrarDetalle();
                    }}
                    className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50"
                  >
                    Rechazar
                  </button>
                </>
              )}

              {desafioDetalle.estado === "Aceptado" && (
                <>
                  <button
                    onClick={() => {
                      abrirModalResultado(desafioDetalle);
                      cerrarDetalle();
                    }}
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Cargar resultado
                  </button>
                  <button
                    onClick={async () => {
                      await handleRechazar(desafioDetalle.id);
                      cerrarDetalle();
                    }}
                    className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50"
                  >
                    Rechazar
                  </button>
                </>
              )}

              {(desafioDetalle.estado === "Jugado" || desafioDetalle.estado === "Rechazado") && (
                <button
                  onClick={cerrarDetalle}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal NUEVO DESAFÍO */}
      {showCrear && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold"></h3>
              <button
                type="button"
                onClick={() => !creating && setShowCrear(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            {parejaRetadoraSeleccionada && parejaRetadaSeleccionada && (
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] space-y-1">
                <p className="flex items-center gap-1">
                  <span className="text-pink-500">🔑</span>
                  <span>
                    {etiquetaRetadora} VS {etiquetaRetada}
                  </span>
                </p>
                {puestoEnJuego && (
                  <p className="flex items-center gap-1 text-amber-700">
                    <span>🏅</span>
                    <span>Puesto en juego: N.º {puestoEnJuego}</span>
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitCrear} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Pareja retadora
                  </label>
                  <select
                    name="retadora_pareja_id"
                    value={formCrear.retadora_pareja_id}
                    onChange={handleCrearChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {opcionesParejas.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Pareja retada
                  </label>
                  <select
                    name="retada_pareja_id"
                    value={formCrear.retada_pareja_id}
                    onChange={handleCrearChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {opcionesParejas.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    name="fecha"
                    value={formCrear.fecha}
                    onChange={handleCrearChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    name="hora"
                    value={formCrear.hora}
                    onChange={handleCrearChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Observación
                </label>
                <textarea
                  name="observacion"
                  value={formCrear.observacion}
                  onChange={handleCrearChange}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Ej: Partido de prueba desde panel"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full mt-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? "Creando…" : "Crear desafío"}
              </button>
            </form>
          </div>
        </div>
      )}

      {desafioSeleccionado && (
        <CargarResultado
          desafio={desafioSeleccionado}
          onClose={() => setDesafioSeleccionado(null)}
          onSaved={cargarDesafios}
        />
      )}
    </div>
  );
};

// -------------------- APP (Login + Tabs) --------------------
const App: React.FC = () => {
  const [isLogged, setIsLogged] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [activeTab, setActiveTab] = useState<TabId>("desafiosMasculinos");
  const [openDesafioId, setOpenDesafioId] = useState<number | null>(null);

  // ✅ NUEVO: estado del toast para foreground
  const [fgToast, setFgToast] = useState<{ open: boolean; title: string; body: string; url: string }>(
    {
      open: false,
      title: "",
      body: "",
      url: "/",
    }
  );

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("open_desafio");
    if (!v) return;

    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return;

    setActiveTab("desafiosMasculinos");
    setOpenDesafioId(n);

    sp.delete("open_desafio");
    const newUrl = `${window.location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}${window.location.hash || ""}`;
    window.history.replaceState({}, "", newUrl);
  }, []);

  useEffect(() => {
    listenForegroundPush();
  }, []);

  // ✅ NUEVO: conectamos el callback del push.ts para que muestre toast adentro
  useEffect(() => {
    setOnForegroundToast((info) => {
      setFgToast({ open: true, ...info });
    });

    return () => setOnForegroundToast(null);
  }, []);

  useEffect(() => {
    // ✅ si ya está logueado y el permiso ya está granted, auto registrar
    if (!isLogged) return;
    void tryAutoRegisterPush();
  }, [isLogged]);

  const headerByTab: Record<TabId, { title: string; subtitle: string }> = {
    desafiosMasculinos: {
      title: "🏆 Ranking Pádel Oficial",
      subtitle: "Sistema oficial de desafíos, resultados y posiciones.",
    },
    ranking: {
      title: "📊 Ranking General",
      subtitle: "Tabla de posiciones y estadísticas del torneo.",
    },
    jugadores: {
      title: "👥 Jugadores",
      subtitle: "Listado de jugadores registrados en el sistema.",
    },
    desafiosFemeninos: {
      title: "🎾 Desafíos Femeninos",
      subtitle: "Desafíos A | B | C (pendiente de implementación).",
    },
  };

  const header = headerByTab[activeTab];

  const handleLoggedIn = () => setIsLogged(true);

  const handleLogout = () => {
    logout();
    setIsLogged(false);
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-sm">
          <Login onLoggedIn={handleLoggedIn} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* ✅ NUEVO: toast foreground */}
      <ForegroundToast
        open={fgToast.open}
        title={fgToast.title}
        body={fgToast.body}
        onClose={() => setFgToast((t) => ({ ...t, open: false }))}
        onClick={() => {
          // al click, abrimos el link (por ejemplo ?open_desafio=...)
          try {
            window.focus();
            window.location.assign(fgToast.url || "/");
          } catch {
            window.open(fgToast.url || "/", "_blank");
          } finally {
            setFgToast((t) => ({ ...t, open: false }));
          }
        }}
      />

      <main className="flex-1 pb-16">
        {activeTab === "desafiosMasculinos" && (
          <DesafiosView
            onLogout={handleLogout}
            headerTitle={header.title}
            headerSubtitle={header.subtitle}
            openDesafioId={openDesafioId}
            clearOpenDesafio={() => setOpenDesafioId(null)}
          />
        )}

        {activeTab === "ranking" && <RankingView />}

        {activeTab === "jugadores" && <JugadoresView onLogout={handleLogout} />}

        {activeTab === "desafiosFemeninos" && (
          <div className="min-h-[calc(100vh-120px)] flex items-center justify-center text-xs text-slate-400">
            Desafíos femeninos A/B/C (pendiente).
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto flex">
          <button
            type="button"
            onClick={() => setActiveTab("desafiosMasculinos")}
            className={`flex-1 py-2.5 flex flex-col items-center justify-center text-[11px] ${
              activeTab === "desafiosMasculinos" ? "text-sky-600" : "text-slate-400"
            }`}
          >
            <span className="text-lg">🎾</span>
            <span>Desafíos Masc.</span>
            <span className="text-[10px]">A | B | C</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ranking")}
            className={`flex-1 py-2.5 flex flex-col items-center justify-center text-[11px] ${
              activeTab === "ranking" ? "text-sky-600" : "text-slate-400"
            }`}
          >
            <span className="text-lg">📊</span>
            <span>Ranking</span>
            <span className="text-[10px]">General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("jugadores")}
            className={`flex-1 py-2.5 flex flex-col items-center justify-center text-[11px] ${
              activeTab === "jugadores" ? "text-sky-600" : "text-slate-400"
            }`}
          >
            <span className="text-lg">👥</span>
            <span>Jugadores</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("desafiosFemeninos")}
            className={`flex-1 py-2.5 flex flex-col items-center justify-center text-[11px] ${
              activeTab === "desafiosFemeninos" ? "text-sky-600" : "text-slate-400"
            }`}
          >
            <span className="text-lg">🎾</span>
            <span>Desafíos Fem.</span>
            <span className="text-[10px]">A | B | C</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
