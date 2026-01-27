// src/App.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import type { Desafio } from "./types/desafios";
import type { ParejaDesafiable } from "./types/parejas";

import {
  getDesafioById,
  crearDesafio,
  aceptarDesafio,
  rechazarDesafio,
  reprogramarDesafio,
  getMiDupla, // ✅ NUEVO
  getMuroDesafios, // ✅ NUEVO: muro (global)
} from "./services/desafio";
import { getParejasDesafiables } from "./services/parejas";
import Login from "./views/Auth/Login";
import { logout } from "./services/auth";
import CargarResultado from "./CargarResultado";
import RankingView from "./views/Ranking";
import RankingMenu from "./views/RankingMenu";
import JugadoresView from "./views/Jugadores";

import {
  activarNotificacionesYGuardar,
  listenForegroundPush,
  tryAutoRegisterPush,
  setOnForegroundToast,
} from "./push";

import ForegroundToast from "./components/ForegroundToast";

// ✅ NUEVO: “pegar” hora a :00
function snapToHour(value: string): string {
  const v = (value || "").trim();
  if (!v) return v;
  const hh = v.slice(0, 2);
  return `${hh}:00`;
}

// ✅ NUEVO: weekday en español + formato “Miércoles 21 / 18:00 hs”
function formatFechaJugadoBonita(fechaYYYYMMDD: string, horaHHMM: string): string {
  try {
    const d = new Date(`${fechaYYYYMMDD}T00:00:00`);
    const dias = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const label = dias[d.getDay()];
    const dia = d.getDate().toString();
    const hhmm = (horaHHMM || "00:00").slice(0, 5);
    return `${label} ${dia} / ${hhmm} hs`;
  } catch {
    return `${fechaYYYYMMDD} / ${(horaHHMM || "00:00").slice(0, 5)} hs`;
  }
}

// ✅ NUEVO: horas redondas para selects
function buildHorasRedondas(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) out.push(`${String(h).padStart(2, "0")}:00`);
  return out;
}

// ✅ NUEVO: categoría desde grupo (Masculino A -> Masculino)
function categoriaFromGrupo(grupo?: string | null): string {
  const g = (grupo || "").trim();
  if (!g) return "";
  return g.split(" ")[0].toLowerCase();
}

type Estado = Desafio["estado"];

const BadgeEstado: React.FC<{ estado: Estado }> = ({ estado }) => {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold";

  const classes: Record<Estado, string> = {
    Pendiente: "bg-red-100 text-red-700",
    Aceptado: "bg-sky-100 text-sky-700",
    Rechazado: "bg-orange-100 text-orange-700",
    Jugado: "bg-emerald-100 text-emerald-700",
  };

  const label = estado === "Jugado" ? "🏆 Jugado" : estado;
  return <span className={`${base} ${classes[estado]}`}>{label}</span>;
};

// ✅ NUEVO: color del título por estado (vista principal)
function tituloColorByEstado(estado: Estado): string {
  const map: Record<Estado, string> = {
    Pendiente: "text-red-700",
    Aceptado: "text-sky-700",
    Rechazado: "text-orange-700",
    Jugado: "text-emerald-700",
  };
  return map[estado] || "text-slate-800";
}

// ✅ NUEVO: “Se jugará …” / “Se jugó …”
function buildFechaLinea(d: Desafio): { label: string; cls: string } {
  const hora = (d.hora || "00:00:00").slice(0, 5);

  const fj = (d as any).fecha_jugado as string | undefined;
  const fechaBase = fj && fj.trim() ? fj : d.fecha;

  const bonita = formatFechaJugadoBonita(fechaBase, hora);

  if (d.estado === "Jugado") {
    return { label: `Se jugó ${bonita}`, cls: "text-emerald-700" };
  }

  return { label: `Se jugará ${bonita}`, cls: "text-slate-500" };
}

type TabId =
  | "desafiosMasculinos"
  | "ranking"
  | "jugadores"
  | "desafiosFemeninos";

const DesafiosView: React.FC<{
  onLogout: () => void;
  headerTitle: string;
  headerSubtitle: string;
  openDesafioId?: number | null;
  clearOpenDesafio?: () => void;
}> = ({
  onLogout,
  headerTitle,
  headerSubtitle,
  openDesafioId,
  clearOpenDesafio,
}) => {
  const [items, setItems] = useState<Desafio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [parejas, setParejas] = useState<ParejaDesafiable[]>([]);

  // ✅ mi dupla (id + grupo + posición)
  const [miDupla, setMiDupla] = useState<{
    id: number;
    etiqueta?: string;
    nombre?: string;
    grupo?: string | null;
    posicion_actual?: number | null; // ✅ IMPORTANTE para regla 3 arriba
  } | null>(null);

  const [showCrear, setShowCrear] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formCrear, setFormCrear] = useState({
    retadora_pareja_id: "",
    retada_pareja_id: "",
    fecha: "",
    hora: "",
    observacion: "",
  });

  const [showReprogramar, setShowReprogramar] = useState(false);
  const [reprogramando, setReprogramando] = useState(false);
  const [reprogramarTarget, setReprogramarTarget] = useState<Desafio | null>(null);
  const [formReprogramar, setFormReprogramar] = useState({
    fecha: "",
    hora: "",
  });

  const [desafioSeleccionado, setDesafioSeleccionado] =
    useState<Desafio | null>(null);

  const [desafioDetalle, setDesafioDetalle] = useState<Desafio | null>(null);
  const openHandledRef = useRef<number | null>(null);

  const horasRedondas = useMemo(() => buildHorasRedondas(), []);

  const cargarDesafios = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ MURO GLOBAL: acá deben venir TODOS los partidos (por jugar + jugados + etc.)
      const data = await getMuroDesafios();

      // ✅ Orden: MÁS RECIENTE primero (defensivo)
      const dt = (x: Desafio) => {
        const hora = (x.hora || "00:00:00").slice(0, 8);
        const fj = (x as any).fecha_jugado as string | undefined;
        const fechaBase =
          x.estado === "Jugado" && fj && fj.trim() ? fj : x.fecha;
        return new Date(`${fechaBase}T${hora}`).getTime();
      };

      const order: Record<string, number> = {
        Pendiente: 0,
        Aceptado: 1,
        Jugado: 2,
        Rechazado: 3,
      };

      const sorted = [...data].sort((a, b) => {
        const ta = dt(a);
        const tb = dt(b);
        if (tb !== ta) return tb - ta;

        const oa = order[a.estado] ?? 99;
        const ob = order[b.estado] ?? 99;
        return oa - ob;
      });

      setItems(sorted);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al cargar el muro");
    } finally {
      setLoading(false);
    }
  };

  const cargarParejas = async (grupo?: string | null) => {
    try {
      const data = await getParejasDesafiables(grupo);
      setParejas(data);
    } catch (err) {
      console.error("Error cargando parejas desafiables", err);
    }
  };

  useEffect(() => {
    void cargarDesafios();

    // ✅ cargar mi dupla (grupo y posición) + parejas filtradas por grupo
    (async () => {
      try {
        const d: any = await getMiDupla();
        setMiDupla({
          id: d.id,
          etiqueta: d.etiqueta,
          nombre: d.nombre,
          grupo: d.grupo ?? null,
          posicion_actual: (d.posicion_actual ?? d.posicion ?? null) as any,
        });

        // opcional: guardo id en el form (compat interna)
        setFormCrear((p) => ({ ...p, retadora_pareja_id: String(d.id) }));

        await cargarParejas(d?.grupo ?? null);
      } catch (e) {
        console.warn("No se pudo cargar mi dupla", e);
        setMiDupla(null);

        // fallback: cargo sin filtro
        await cargarParejas();
      }
    })();
  }, []);

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

    if (loading) return;

    (async () => {
      try {
        openHandledRef.current = openDesafioId;
        const d = await getDesafioById(openDesafioId);

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

  // ✅ filtro UI para que no te muestre parejas de otra categoría (Masculino/Femenino)
  const parejasFiltradas = useMemo(() => {
    const myCat = categoriaFromGrupo(miDupla?.grupo);
    if (!myCat) return parejas;
    return parejas.filter((p) => categoriaFromGrupo(p.grupo) === myCat);
  }, [parejas, miDupla?.grupo]);

  // ✅ REGLA (CLIENTE): solo 3 puestos arriba (NO ±3)
  const parejasPorRegla = useMemo(() => {
    const myPos = (miDupla?.posicion_actual ?? null) as number | null;

    if (!myPos) return parejasFiltradas;

    return parejasFiltradas.filter((p) => {
      const pos = (p as any).posicion_actual ?? (p as any).posicion ?? null;
      if (!pos || !Number.isFinite(pos)) return false;

      if (String(p.id) === String(miDupla?.id)) return false;

      const targetPos = Number(pos);
      const mine = Number(myPos);

      return targetPos < mine && (mine - targetPos) <= 3;
    });
  }, [parejasFiltradas, miDupla?.posicion_actual, miDupla?.id]);

  const opcionesParejas = useMemo(
    () =>
      parejasPorRegla.map((p) => ({
        value: String(p.id),
        label: (p as any).etiqueta ?? (p as any).nombre ?? `Pareja ${p.id}`,
      })),
    [parejasPorRegla]
  );

  const mapaParejas = useMemo(() => {
    const map = new Map<number, string>();
    parejasFiltradas.forEach((p) => {
      const label = (p as any).etiqueta ?? (p as any).nombre ?? `Pareja ${p.id}`;
      map.set(p.id, label);
    });
    return map;
  }, [parejasFiltradas]);

  const construirTituloDesafio = (d: Desafio): string => {
    const retadora = mapaParejas.get(d.retadora_pareja_id);
    const retada = mapaParejas.get(d.retada_pareja_id);

    if (retadora && retada) return `${retadora} VS ${retada}`;
    if (d.titulo_desafio && d.titulo_desafio.trim() !== "") return d.titulo_desafio;

    return `${d.retadora_pareja_id} vs ${d.retada_pareja_id}`;
  };

  const labelPareja = (id: number | null | undefined): string => {
    if (!id) return "—";
    return mapaParejas.get(id) ?? `Pareja ${id}`;
  };

 // ✅ permisos (NUEVO): retador y desafiado pueden gestionar
  const canManage = (d: Desafio) =>
    !!miDupla?.id &&
    (d.retada_pareja_id === miDupla.id || d.retadora_pareja_id === miDupla.id);

  // ✅ resultado: cualquiera de las 2 parejas del partido
  const canLoadResult = (d: Desafio) =>
    !!miDupla?.id &&
    (d.retada_pareja_id === miDupla.id || d.retadora_pareja_id === miDupla.id);

  const handleCrearChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "hora") value = snapToHour(value);

    setFormCrear((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitCrear = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      if (!miDupla?.id) {
        throw new Error("No se pudo cargar tu dupla. Volvé a iniciar sesión.");
      }
      if (!formCrear.retada_pareja_id) {
        throw new Error("Seleccioná la dupla desafiada.");
      }
      if (!formCrear.fecha || !formCrear.hora) {
        throw new Error("Completá fecha y hora.");
      }

      if (Number(formCrear.retada_pareja_id) === miDupla.id) {
        throw new Error("No podés desafiar a tu misma dupla.");
      }

      const myPos = miDupla.posicion_actual ?? null;
      const target = parejasFiltradas.find(
        (p) => String(p.id) === String(formCrear.retada_pareja_id)
      );
      const targetPos =
        (target as any)?.posicion_actual ?? (target as any)?.posicion ?? null;

      if (myPos && targetPos && Number.isFinite(myPos) && Number.isFinite(targetPos)) {
        const mine = Number(myPos);
        const tp = Number(targetPos);

        if (!(tp < mine && (mine - tp) <= 3)) {
          throw new Error("Regla: solo podés desafiar hasta 3 puestos arriba.");
        }
      } else {
        console.warn("No hay posiciones para validar regla (myPos/targetPos).");
      }

      await crearDesafio({
        retada_pareja_id: Number(formCrear.retada_pareja_id),
        fecha: formCrear.fecha,
        hora: formCrear.hora,
        observacion: formCrear.observacion || undefined,
      } as any);

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

  const handleAceptar = async (d: Desafio) => {
    try {
      setError(null);
      if (!canManage(d)) {
        throw new Error("Solo las parejas del partido pueden gestionar este desafío.");
      }
      await aceptarDesafio(d.id);
      await cargarDesafios();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo aceptar el desafío");
    }
  };

  const handleRechazar = async (d: Desafio) => {
    try {
      setError(null);
      if (!canManage(d)) {
        throw new Error("Solo la dupla desafiada puede rechazar este desafío.");
      }
      await rechazarDesafio(d.id);
      await cargarDesafios();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo rechazar el desafío");
    }
  };

  const abrirModalResultado = (d: Desafio) => {
    if (!canLoadResult(d)) {
      alert("Solo las parejas del partido pueden cargar el resultado.");
      return;
    }
    const tituloUI = construirTituloDesafio(d);
    const copia = { ...d, titulo_desafio: tituloUI };
    setDesafioSeleccionado(copia);
  };

  const cerrarDetalle = () => {
    openHandledRef.current = null;
    setDesafioDetalle(null);
  };

  const abrirReprogramar = (d: Desafio) => {
    if (!canManage(d)) {
      alert("Solo la dupla desafiada puede reprogramar.");
      return;
    }
    setReprogramarTarget(d);
    setFormReprogramar({
      fecha: d.fecha,
      hora: snapToHour((d.hora || "00:00:00").slice(0, 5)),
    });
    setShowReprogramar(true);
  };

  const handleSubmitReprogramar = async (e: FormEvent) => {
    e.preventDefault();
    if (!reprogramarTarget) return;

    try {
      setReprogramando(true);
      setError(null);

      if (!canManage(reprogramarTarget)) {
        throw new Error("Solo la dupla desafiada puede reprogramar.");
      }

      if (!formReprogramar.fecha || !formReprogramar.hora) {
        throw new Error("Completá fecha y hora.");
      }

      await reprogramarDesafio(reprogramarTarget.id, {
        fecha: formReprogramar.fecha,
        hora: formReprogramar.hora,
      });

      setShowReprogramar(false);
      setReprogramarTarget(null);

      await cargarDesafios();
      alert("✅ Desafío reprogramado y notificado.");
    } catch (err: any) {
      console.error(err);
      setError(err?.detail || err?.message || "No se pudo reprogramar el desafío");
    } finally {
      setReprogramando(false);
    }
  };

  const parejaRetadaSeleccionada = parejasFiltradas.find(
    (p) => String(p.id) === formCrear.retada_pareja_id
  );

  const puestoEnJuego =
    miDupla?.id && parejaRetadaSeleccionada
      ? Math.min(
          (miDupla.posicion_actual ?? 0) as any,
          ((parejaRetadaSeleccionada as any).posicion_actual ?? 0) as any
        )
      : null;

  const getSets = (d: Desafio) => {
    const s1r = (d as any).set1_retador;
    const s1d = (d as any).set1_desafiado;
    const s2r = (d as any).set2_retador;
    const s2d = (d as any).set2_desafiado;
    const s3r = (d as any).set3_retador;
    const s3d = (d as any).set3_desafiado;

    const has1 = Number.isFinite(s1r) && Number.isFinite(s1d);
    const has2 = Number.isFinite(s2r) && Number.isFinite(s2d);
    const has3 =
      (s3r !== null && s3r !== undefined) ||
      (s3d !== null && s3d !== undefined);

    if (!has1 && !has2 && !has3) return null;

    return {
      set1: has1 ? { r: s1r, d: s1d } : null,
      set2: has2 ? { r: s2r, d: s2d } : null,
      set3: has3 ? { r: s3r ?? null, d: s3d ?? null } : null,
    };
  };

  const getResultadoResumen = (d: Desafio): string | null => {
    const sets = getSets(d);
    if (!sets) return null;

    const parts: string[] = [];
    if (sets.set1) parts.push(`${sets.set1.r}/${sets.set1.d}`);
    if (sets.set2) parts.push(`${sets.set2.r}/${sets.set2.d}`);
    if (sets.set3 && (sets.set3.r !== null || sets.set3.d !== null)) {
      parts.push(`${sets.set3.r ?? "—"}/${sets.set3.d ?? "—"}`);
    }

    return parts.length ? parts.join(" – ") : null;
  };

  const getFechaJugadoLabelBonita = (d: Desafio) => {
    const fj = (d as any).fecha_jugado as string | undefined;
    const fecha = fj && fj.trim() ? fj : d.fecha;
    const hora = (d.hora || "00:00:00").slice(0, 5);
    return formatFechaJugadoBonita(fecha, hora);
  };

  const getCambioPosiciones = (d: Desafio) => {
    const oldR = d.pos_retadora_old;
    const oldD = d.pos_retada_old;

    if (oldR == null || oldD == null) return null;

    if (d.swap_aplicado) {
      return {
        retadora: { old: oldR, new: oldD },
        retada: { old: oldD, new: oldR },
      };
    }

    return {
      retadora: { old: oldR, new: oldR },
      retada: { old: oldD, new: oldD },
    };
  };

  const tituloCrear = useMemo(() => {
    const retadora = miDupla?.etiqueta || miDupla?.nombre || "Tu dupla";
    const retada =
      (parejaRetadaSeleccionada as any)?.etiqueta ||
      (parejaRetadaSeleccionada as any)?.nombre ||
      (formCrear.retada_pareja_id ? "Dupla seleccionada" : "Seleccionar...");
    return `${retadora} VS ${retada}`;
  }, [miDupla?.etiqueta, miDupla?.nombre, parejaRetadaSeleccionada, formCrear.retada_pareja_id]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {headerTitle}
            </h1>
            <p className="text-[13px] text-slate-500 leading-snug">
              {headerSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const r = await tryAutoRegisterPush();

                  if (r.ok || r.reason === "already_registered") {
                    alert("✅ Notificaciones ya estaban listas.");
                    return;
                  }

                  if (r.reason === "unsupported") {
                    alert(
                      r.message ||
                        "Este navegador no soporta notificaciones. Abrí en Safari/Chrome."
                    );
                    return;
                  }

                  if (r.reason === "denied") {
                    alert(
                      "⚠️ Tenés bloqueadas las notificaciones.\n\n" +
                        "iPhone: Ajustes > Notificaciones > (Safari/PWA)\n" +
                        "Android: Configuración del sitio > Notificaciones"
                    );
                    return;
                  }

                  if (r.reason === "need_permission") {
                    await activarNotificacionesYGuardar();
                    alert("✅ Notificaciones activadas");
                    return;
                  }

                  if (r.reason === "no_session") {
                    alert("⚠️ No hay sesión activa. Volvé a loguearte.");
                    return;
                  }

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
          <h2 className="text-lg font-semibold text-center">Muro de desafíos</h2>
          <p className="text-xs text-center text-slate-500 mt-1">
            Se muestran todos los desafíos del sistema, ordenados por lo más reciente.
          </p>

          <div className="mt-6 space-y-3">
            {loading && <p className="text-xs text-slate-400">Cargando muro…</p>}

            {!loading && error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            {!loading && !error && items.length === 0 && (
              <p className="text-sm text-slate-400 text-center">
                No hay desafíos para mostrar.
              </p>
            )}

            {!loading &&
              !error &&
              items.map((d) => {
                const tituloUI = construirTituloDesafio(d);
                const fechaInfo = buildFechaLinea(d);
                const tituloCls = tituloColorByEstado(d.estado);

                const btnBase =
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-[0.98]";

                // ✅ NUEVO: si soy parte del partido (retador o desafiado)
                const esParteDelPartido =
                  !!miDupla?.id &&
                  (d.retadora_pareja_id === miDupla.id || d.retada_pareja_id === miDupla.id);

                // permisos ya existentes
                const manage = canManage(d);
                const loadResult = canLoadResult(d);

                return (
                  <div
                    key={d.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <h3 className={`text-[13px] font-semibold mb-1 truncate ${tituloCls}`}>
                        {tituloUI}
                      </h3>

                      <p className={`text-[11px] ${fechaInfo.cls}`}>{fechaInfo.label}</p>

                      {d.observacion && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {d.observacion}
                        </p>
                      )}

                      {/* ✅ Solo lectura SOLO si NO sos parte */}
                      {!esParteDelPartido && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Modo muro: solo lectura (ver detalle).
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <BadgeEstado estado={d.estado} />

                      <div className="flex flex-wrap justify-end gap-2">
                        {/* ✅ Acciones solo si sos parte del partido */}
                        {d.estado === "Pendiente" && esParteDelPartido && manage && (
                          <>
                            <button
                              onClick={() => handleAceptar(d)}
                              className={`${btnBase} bg-sky-600 text-white hover:bg-sky-700`}
                              title="Aceptar"
                            >
                              ✅ <span>Aceptar</span>
                            </button>

                            <button
                              onClick={() => handleRechazar(d)}
                              className={`${btnBase} border border-orange-300 text-orange-700 hover:bg-orange-50`}
                              title="Rechazar"
                            >
                              ❌ <span>Rechazar</span>
                            </button>

                            <button
                              onClick={() => abrirReprogramar(d)}
                              className={`${btnBase} border border-indigo-300 text-indigo-700 hover:bg-indigo-50`}
                              title="Reprogramar"
                            >
                              🗓️ <span>Repro</span>
                            </button>
                          </>
                        )}

                        {d.estado === "Aceptado" && esParteDelPartido && (
                          <>
                            {loadResult && (
                              <button
                                onClick={() => abrirModalResultado(d)}
                                className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700`}
                                title="Cargar resultado"
                              >
                                🏆 <span>Resultado</span>
                              </button>
                            )}

                            {manage && (
                              <>
                                <button
                                  onClick={() => abrirReprogramar(d)}
                                  className={`${btnBase} border border-indigo-300 text-indigo-700 hover:bg-indigo-50`}
                                  title="Reprogramar"
                                >
                                  🗓️ <span>Repro</span>
                                </button>

                                <button
                                  onClick={() => handleRechazar(d)}
                                  className={`${btnBase} border border-orange-300 text-orange-700 hover:bg-orange-50`}
                                  title="Rechazar"
                                >
                                  ❌ <span>Rechazar</span>
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {/* ✅ Detalle siempre */}
                        <button
                          onClick={async () => {
                            setDesafioDetalle(d);
                            try {
                              const full = await getDesafioById(d.id);
                              setDesafioDetalle(full);
                            } catch (e) {
                              console.warn("No se pudo traer detalle completo del desafío", e);
                            }
                          }}
                          className={`${btnBase} border border-slate-300 text-slate-700 hover:bg-slate-100`}
                          title="Ver detalle"
                        >
                          🔎 <span>Detalle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      {/* Modal REPROGRAMAR */}
      {showReprogramar && reprogramarTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Reprogramar desafío</h3>
              <button
                type="button"
                onClick={() => !reprogramando && setShowReprogramar(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Solo la dupla desafiada puede reprogramar.
            </p>

            <form onSubmit={handleSubmitReprogramar} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formReprogramar.fecha}
                    onChange={(e) =>
                      setFormReprogramar((p) => ({
                        ...p,
                        fecha: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Hora
                  </label>
                  <select
                    value={formReprogramar.hora}
                    onChange={(e) =>
                      setFormReprogramar((p) => ({
                        ...p,
                        hora: snapToHour(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {horasRedondas.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={reprogramando}
                className="w-full mt-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {reprogramando ? "Guardando…" : "Guardar reprogramación"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal DETALLE */}
      {desafioDetalle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3">
          <div className="w-full max-w-lg max-h-[92vh] rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Detalle del partido</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {getFechaJugadoLabelBonita(desafioDetalle)}
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

              <div className="flex items-center justify-between mt-3">
                <BadgeEstado estado={desafioDetalle.estado} />
                <span className="text-[11px] text-slate-400">
                  ID: {desafioDetalle.id}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 overflow-y-auto">
              {desafioDetalle.estado === "Jugado" && desafioDetalle.ganador_pareja_id ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 mb-4">
                  <p className="text-xs font-semibold text-emerald-800">🏆 Ganador</p>
                  <p className="text-lg font-bold text-emerald-800">
                    {labelPareja(desafioDetalle.ganador_pareja_id)}
                  </p>

                  <div className="mt-2 text-[12px] text-emerald-900 space-y-1">
                    <div>
                      <span className="font-semibold">Resultado:</span>{" "}
                      {getResultadoResumen(desafioDetalle) ?? "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Fecha que se jugó:</span>{" "}
                      {getFechaJugadoLabelBonita(desafioDetalle)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-[13px] font-semibold">
                    {construirTituloDesafio(desafioDetalle)}
                  </p>
                </div>
              )}

              {desafioDetalle.observacion && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700 mb-4">
                  {desafioDetalle.observacion}
                </div>
              )}

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
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white">
              <div className="flex flex-wrap gap-2 justify-end">
                {desafioDetalle.estado === "Pendiente" && canManage(desafioDetalle) && (
                  <>
                    <button
                      onClick={async () => {
                        await handleAceptar(desafioDetalle);
                        cerrarDetalle();
                      }}
                      className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                    >
                      Aceptar
                    </button>

                    <button
                      onClick={async () => {
                        await handleRechazar(desafioDetalle);
                        cerrarDetalle();
                      }}
                      className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50"
                    >
                      Rechazar
                    </button>

                    <button
                      onClick={() => {
                        abrirReprogramar(desafioDetalle);
                        cerrarDetalle();
                      }}
                      className="rounded-full border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Reprogramar
                    </button>
                  </>
                )}

                {desafioDetalle.estado === "Aceptado" && (
                  <>
                    {canLoadResult(desafioDetalle) && (
                      <button
                        onClick={() => {
                          abrirModalResultado(desafioDetalle);
                          cerrarDetalle();
                        }}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Cargar resultado
                      </button>
                    )}
                    {canManage(desafioDetalle) && (
                      <button
                        onClick={async () => {
                          await handleRechazar(desafioDetalle);
                          cerrarDetalle();
                        }}
                        className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50"
                      >
                        Rechazar
                      </button>
                    )}
                  </>
                )}

                {(desafioDetalle.estado === "Jugado" ||
                  desafioDetalle.estado === "Rechazado" ||
                  (!canManage(desafioDetalle) &&
                    (desafioDetalle.estado === "Pendiente" || desafioDetalle.estado === "Aceptado"))) && (
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
        </div>
      )}

      {/* Modal NUEVO DESAFÍO */}
      {showCrear && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">⚔️ Nuevo desafío</h3>
              <button
                type="button"
                onClick={() => !creating && setShowCrear(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] space-y-1">
              <p className="text-slate-700 font-semibold">{tituloCrear}</p>

              {miDupla?.posicion_actual ? (
                <p className="text-slate-500">
                  Tu posición: <span className="font-semibold">#{miDupla.posicion_actual}</span>
                </p>
              ) : (
                <p className="text-slate-400">
                  (No se detectó tu posición; revisá que /desafios/mi-dupla devuelva posicion_actual)
                </p>
              )}
            </div>

            <form onSubmit={handleSubmitCrear} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Dupla retadora
                  </label>

                  <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {miDupla?.etiqueta || miDupla?.nombre || "Cargando tu dupla..."}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        🔒
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Dupla desafiada
                  </label>
                  <select
                    name="retada_pareja_id"
                    value={formCrear.retada_pareja_id}
                    onChange={handleCrearChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                    disabled={!miDupla?.id}
                  >
                    <option value="">Seleccionar…</option>
                    {opcionesParejas.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  {miDupla?.grupo && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Mostrando parejas de:{" "}
                      <span className="font-semibold">{miDupla.grupo}</span>
                    </p>
                  )}

                  {miDupla?.id && opcionesParejas.length === 0 && (
                    <p className="mt-1 text-[10px] text-red-500">
                      No hay parejas disponibles dentro de 3 puestos arriba.
                    </p>
                  )}
                </div>
              </div>

              {puestoEnJuego && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
                  <span className="text-amber-700">🏅</span>{" "}
                  <span className="text-slate-700">
                    Puesto en juego: <span className="font-semibold">N.º {puestoEnJuego}</span>
                  </span>
                </div>
              )}

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
                  <select
                    name="hora"
                    value={formCrear.hora}
                    onChange={handleCrearChange}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {horasRedondas.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
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

const App: React.FC = () => {
  const [isLogged, setIsLogged] = useState<boolean>(() => !!localStorage.getItem("token"));
  const [activeTab, setActiveTab] = useState<TabId>("desafiosMasculinos");
  const [openDesafioId, setOpenDesafioId] = useState<number | null>(null);

  const [rankingScreen, setRankingScreen] = useState<"menu" | "detalle">("menu");
  const [rankingFilter, setRankingFilter] = useState<{
    genero: "M" | "F";
    grupo: "A" | "B" | "C";
  }>({ genero: "M", grupo: "B" });

  const [fgToast, setFgToast] = useState<{
    open: boolean;
    title: string;
    body: string;
    url: string;
  }>({
    open: false,
    title: "",
    body: "",
    url: "/",
  });

  useEffect(() => {
    const tryOpenFromUrl = () => {
      const sp = new URLSearchParams(window.location.search);
      const v = sp.get("open_desafio");
      if (!v) return;

      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return;

      setActiveTab("desafiosMasculinos");
      setOpenDesafioId(n);

      sp.delete("open_desafio");
      const newUrl = `${window.location.pathname}${
        sp.toString() ? `?${sp.toString()}` : ""
      }${window.location.hash || ""}`;
      window.history.replaceState({}, "", newUrl);
    };

    tryOpenFromUrl();
    window.addEventListener("focus", tryOpenFromUrl);
    window.addEventListener("popstate", tryOpenFromUrl);

    return () => {
      window.removeEventListener("focus", tryOpenFromUrl);
      window.removeEventListener("popstate", tryOpenFromUrl);
    };
  }, []);

  useEffect(() => {
    listenForegroundPush();
  }, []);

  useEffect(() => {
    setOnForegroundToast((info) => {
      setFgToast({ open: true, ...info });
    });

    return () => setOnForegroundToast(null);
  }, []);

  useEffect(() => {
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
      <ForegroundToast
        open={fgToast.open}
        title={fgToast.title}
        body={fgToast.body}
        onClose={() => setFgToast((t) => ({ ...t, open: false }))}
        onClick={() => {
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

        {activeTab === "ranking" &&
          (rankingScreen === "menu" ? (
            <RankingMenu
              onSelect={(f) => {
                setRankingFilter(f);
                setRankingScreen("detalle");
              }}
            />
          ) : (
            <RankingView
              grupo={rankingFilter.grupo}
              genero={rankingFilter.genero}
              onBack={() => setRankingScreen("menu")}
            />
          ))}

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
            onClick={() => {
              setActiveTab("ranking");
              setRankingScreen("menu");
              setRankingFilter({ genero: "M", grupo: "A" });
            }}
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
