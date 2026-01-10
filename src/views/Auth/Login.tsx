import React, { useState } from "react";
import { login } from "../../services/auth";
import { activarNotificaciones, registerPushToken } from "../../push";

type LoginProps = {
  onLoggedIn: () => void;
};

const Login: React.FC<LoginProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [fcmToken, setFcmToken] = useState<string>("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);

    try {
      const resp = await login(email.trim());
      // tu login() ya guarda el JWT en localStorage ("token")

      setMsg(resp?.login_url ? "📩 Link enviado al email (si aplica)" : "✅ Login OK");

      // si tu backend devuelve token directo, ya podés entrar
      onLoggedIn();
    } catch (err: any) {
      setError(err?.message || "Error logueando");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivarNotificaciones() {
    setError("");
    setMsg("");

    try {
      const jwt = localStorage.getItem("token") || "";
      if (!jwt) throw new Error("No hay JWT en localStorage. Logueate primero.");

      const token = await activarNotificaciones();
      setFcmToken(token);

      // 🔥 ACÁ está lo importante: registrar el token en tu backend
      const r = await registerPushToken(jwt, token);

      setMsg(`✅ Notificaciones activadas y token registrado (jugador_id=${r?.jugador_id ?? "?"})`);
    } catch (err: any) {
      setError(err?.message || "Error activando notificaciones");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-5">
        <h1 className="text-xl font-bold">Login</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ingresá tu email para obtener acceso.
        </p>

        <form onSubmit={handleLogin} className="mt-4 space-y-3">
          <input
            className="w-full border rounded-xl p-3 outline-none"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl p-3 font-semibold bg-black text-white disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleActivarNotificaciones}
            className="flex-1 rounded-xl p-3 font-semibold border"
          >
            🔔 Activar notificaciones
          </button>
        </div>

        {msg && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
            {msg}
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </p>
        )}

        {fcmToken && (
          <p className="mt-3 text-[10px] text-slate-500 text-center break-all">
            ✅ FCM listo: {fcmToken.slice(0, 30)}...
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
