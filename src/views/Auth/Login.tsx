import React, { useEffect, useMemo, useState } from "react";
import { login } from "../../services/auth";
import { activarNotificacionesYGuardar, tryAutoRegisterPush } from "../../push";

type LoginProps = {
  onLoggedIn: () => void;
};

function detectProvider(email: string): string {
  const e = email.toLowerCase().trim();
  const domain = e.split("@")[1] || "";
  if (domain.includes("gmail")) return "Google";
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live"))
    return "Microsoft";
  if (domain.includes("icloud")) return "Apple";
  if (domain.includes("yahoo")) return "Yahoo";
  return domain ? domain : "tu proveedor";
}

const Login: React.FC<LoginProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState("");
  const provider = useMemo(() => detectProvider(email), [email]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [showEnablePush, setShowEnablePush] = useState(false);

  useEffect(() => {
    // ✅ si nunca se registró, mostramos CTA por defecto
    const once = localStorage.getItem("push_registered_once") === "1";
    setShowEnablePush(!once);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);

    try {
      const resp = await login(email.trim());
      setMsg(resp?.login_url ? "📩 Link enviado (si aplica)" : "✅ Login OK");

      // ✅ Intentar auto-registro si ya está granted (sin pedir permiso)
      const auto = await tryAutoRegisterPush();

      if (auto.ok) {
        // ✅ importante: marcamos que ya se registró alguna vez
        localStorage.setItem("push_registered_once", "1");

        setMsg("✅ Login OK · Notificaciones listas");
        setShowEnablePush(false);
      } else {
        // si necesita permiso → mostramos CTA
        if (auto.reason === "need_permission") {
          setShowEnablePush(true);
        }

        // si no soporta → mostramos CTA para explicar
        if (auto.reason === "unsupported") {
          setShowEnablePush(true);
          if (auto.message) setMsg(`ℹ️ ${auto.message}`);
        }

        // si ya estaba registrado, no mostrar CTA
        if (auto.reason === "already_registered") {
          // ✅ marcamos igual, porque ya está listo
          localStorage.setItem("push_registered_once", "1");

          setShowEnablePush(false);
        }
      }

      onLoggedIn();
    } catch (err: any) {
      setError(err?.message || "Error logueando");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnablePush() {
    setError("");
    setMsg("");

    try {
      await activarNotificacionesYGuardar();

      // ✅ importante: marcamos el flag para que no vuelva a molestarte
      localStorage.setItem("push_registered_once", "1");

      setMsg("✅ Notificaciones activadas");
      setShowEnablePush(false);
    } catch (err: any) {
      setError(err?.message || "Error activando notificaciones");
      setShowEnablePush(true);
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-2xl overflow-hidden shadow bg-white">
        {/* Header */}
        <div className="px-6 py-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="text-sm opacity-90">🏆 Ranking Pádel Oficial</div>
          <h1 className="text-2xl font-bold mt-1">Ingresar</h1>
          <p className="text-xs opacity-80 mt-2 leading-snug">
            Sin contraseña. Usá tu email.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Email
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Vas a ingresar con:{" "}
                <span className="font-semibold">{provider}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 font-semibold bg-slate-900 text-white hover:bg-slate-950 disabled:opacity-60"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {showEnablePush && (
            <button
              onClick={handleEnablePush}
              className="w-full rounded-xl py-3 font-semibold border border-slate-200 hover:bg-slate-50"
            >
              🔔 Activar notificaciones (una sola vez)
            </button>
          )}

          {msg && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              {msg}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </p>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            Tip: iPhone → abrí en Safari e instalá (Agregar a pantalla de
            inicio). Android → Chrome/PWA.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
