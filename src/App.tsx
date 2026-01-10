// src/App.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import type { Desafio } from "./types/desafios";
import type { ParejaDesafiable } from "./types/parejas";

import {
  getMisProximosDesafios,
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
import { activarNotificaciones, registerPushToken } from "./push"; // ✅ CAMBIO: agregar registerPushToken

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

type Estado = Desafio["estado"];

// Badge para el estado del desafío (con copita cuando es Jugado)
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

// Tabs del menú inferior
type TabId =
  | "desafiosMasculinos"
  | "ranking"
  | "jugadores"
  | "desafiosFemeninos";

// -------------------- VISTA PRINCIPAL (DESAFÍOS) --------------------
const DesafiosView: React.FC<{
  onLogout: () => void;
  headerTitle: string;
  headerSubtitle: string;
}> = ({ onLogout, headerTitle, headerSubtitle }) => {
  const [items, setItems] = useState<Desafio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parejas para el modal de “Nuevo desafío”
  const [parejas, setParejas] = useState<ParejaDesafiable[]>([]);

  // Modal “Nuevo desafío”
  const [showCrear, setShowCrear] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formCrear, setFormCrear] = useState({
    retadora_pareja_id: "",
    retada_pareja_id: "",
    fecha: "",
    hora: "",
    observacion: "",
  });

  // Modal “Cargar resultado”
  const [desafioSeleccionado, setDesafioSeleccionado] =
    useState<Desafio | null>(null);

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

  // Opciones para los selects de "Nuevo desafío"
  const opcionesParejas = useMemo(
    () =>
      parejas.map((p) => ({
        value: String(p.id),
        // etiqueta viene del backend para mostrar “Rene / Marcos (N° X Grupo Y)”
        label: (p as any).etiqueta ?? (p as any).nombre ?? `Pareja ${p.id}`,
      })),
    [parejas]
  );

  // Mapa id -> etiqueta (para armar el título bonito)
  const mapaParejas = useMemo(() => {
    const map = new Map<number, string>();
    parejas.forEach((p) => {
      const label =
        (p as any).etiqueta ?? (p as any).nombre ?? `Pareja ${p.id}`;
      map.set(p.id, label);
    });
    return map;
  }, [parejas]);

  // Construye el título que queremos mostrar en tarjetas y modal
  const construirTituloDesafio = (d: Desafio): string => {
    const retadora = mapaParejas.get(d.retadora_pareja_id);
    const retada = mapaParejas.get(d.retada_pareja_id);

    if (retadora && retada) {
      return `${retadora} VS ${retada}`;
    }

    // fallback: lo que venga del backend
    if (d.titulo_desafio && d.titulo_desafio.trim() !== "") {
      return d.titulo_desafio;
    }

    // ultra fallback
    return `${d.retadora_pareja_id} vs ${d.retada_pareja_id}`;
  };

  // ---------- Crear desafío ----------
  const handleCrearChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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

  // ---------- Aceptar / Rechazar ----------
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

  // ---------- Cargar resultado (abrir modal) ----------
  const abrirModalResultado = (d: Desafio) => {
    const tituloUI = construirTituloDesafio(d);
    const copia = { ...d, titulo_desafio: tituloUI };
    setDesafioSeleccionado(copia);
  };

  // ---------- Datos auxiliares del modal (llave + puesto en juego) ----------
  const parejaRetadoraSeleccionada = parejas.find(
    (p) => String(p.id) === formCrear.retadora_pareja_id
  );
  const parejaRetadaSeleccionada = parejas.find(
    (p) => String(p.id) === formCrear.retada_pareja_id
  );

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

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
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
            {/* Botón redondo NOTIFICACIONES */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const jwt = localStorage.getItem("token");
                  if (!jwt) {
                    alert("No hay sesión activa (token). Volvé a loguearte.");
                    return;
                  }

                  const fcmToken = await activarNotificaciones();

                  // ✅ CAMBIO: registrar token en backend (Neon)
                  await registerPushToken(jwt, fcmToken);

                  // debug opcional
                  localStorage.setItem("last_fcm_token", fcmToken);

                  alert("✅ Notificaciones activadas y token registrado.");
                } catch (e: any) {
                  console.error(e);
                  alert(e?.message || "Error activando notificaciones");
                }
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-[0.96] transition"
              title="Activar notificaciones"
            >
              <span className="text-xl">🔔</span>
            </button>

            {/* Botón redondo NUEVO DESAFÍO */}
            <button
              type="button"
              onClick={() => setShowCrear(true)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-[0.96] transition"
              title="Nuevo desafío"
            >
              <span className="text-xl">⚔️</span>
            </button>

            {/* Botón redondo SALIR */}
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

        {/* Bloque principal */}
        <section className="bg-white rounded-2xl shadow-sm p-6 mt-2">
          <h2 className="text-lg font-semibold text-center">
            Mis próximos desafíos
          </h2>
          <p className="text-xs text-center text-slate-500 mt-1">
            Se muestran desafíos con estado Pendiente / Aceptado para el
            jugador autenticado.
          </p>

          <div className="mt-6 space-y-3">
            {loading && (
              <p className="text-xs text-slate-400">Cargando desafíos…</p>
            )}

            {!loading && error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            {!loading && !error && items.length === 0 && (
              <p className="text-sm text-slate-400 text-center">
                No tenés desafíos próximos.
              </p>
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
                    {/* Izquierda: info del partido */}
                    <div>
                      <h3 className="text-[13px] font-semibold mb-1">
                        {tituloUI}
                      </h3>

                      <p className="text-[11px] text-slate-500">
                        {formatFecha(d.fecha)} · {d.hora.slice(0, 5)}
                      </p>

                      {d.observacion && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {d.observacion}
                        </p>
                      )}

                      {d.estado === "Jugado" && (
                        <p className="text-[11px] text-emerald-700 mt-1">
                          🏅 Resultado cargado
                        </p>
                      )}
                    </div>

                    {/* Derecha: estado + acciones */}
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
                          <span className="text-[11px] text-slate-400">
                            Desafío rechazado
                          </span>
                        )}

                        {d.estado === "Jugado" && (
                          <span className="text-[11px] text-emerald-700">
                            Partido jugado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

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

            {/* Resumen llave + puesto en juego */}
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

      {/* Gancho al componente CargarResultado */}
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

// -------------------- APP (Login + Tabs tipo AppSheet) --------------------
const App: React.FC = () => {
  const [isLogged, setIsLogged] = useState<boolean>(() => {
    return !!localStorage.getItem("token");
  });

  const [activeTab, setActiveTab] = useState<TabId>("desafiosMasculinos");

  // ✅ AGREGADO: títulos dinámicos por tab
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

  // ✅ AGREGADO: header seleccionado según tab activo
  const header = headerByTab[activeTab];

  const handleLoggedIn = () => {
    setIsLogged(true);
  };

  const handleLogout = () => {
    logout();
    setIsLogged(false);
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6">
          <Login onLoggedIn={handleLoggedIn} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Contenido principal según tab */}
      <main className="flex-1 pb-16">
        {activeTab === "desafiosMasculinos" && (
          <DesafiosView
            onLogout={handleLogout}
            headerTitle={header.title}
            headerSubtitle={header.subtitle}
          />
        )}

        {activeTab === "ranking" && <RankingView />}

        {activeTab === "jugadores" && (
          <JugadoresView onLogout={handleLogout} />
        )}

        {activeTab === "desafiosFemeninos" && (
          <div className="min-h-[calc(100vh-120px)] flex items-center justify-center text-xs text-slate-400">
            Desafíos femeninos A/B/C (pendiente).
          </div>
        )}
      </main>

      {/* Menú inferior estilo AppSheet */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto flex">
          <button
            type="button"
            onClick={() => setActiveTab("desafiosMasculinos")}
            className={`flex-1 py-2.5 flex flex-col items-center justify-center text-[11px] ${
              activeTab === "desafiosMasculinos"
                ? "text-sky-600"
                : "text-slate-400"
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
              activeTab === "desafiosFemeninos"
                ? "text-sky-600"
                : "text-slate-400"
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
