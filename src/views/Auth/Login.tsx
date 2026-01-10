// src/views/Auth/Login.tsx
import React, { useEffect, useMemo, useState } from "react";
import { login } from "../../services/auth";
import { activarNotificaciones, registerPushToken } from "../../push";

interface LoginProps {
  onLoggedIn: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jwt, setJwt] = useState<string>(() => localStorage.getItem("token") || "");
  const [fcmToken, setFcmToken] = useState<string>(() => localStorage.getItem("fcm_token") || "");
  const hasJwt = useMemo(() => !!jwt && jwt.length > 20, [jwt]);
  const hasFcm = useMemo(() => !!fcmToken && fcmToken.length > 20, [fcmToken]);

  // Si tenemos ambos, registramos en backend
  useEffect(() => {
    if (!hasJwt || !hasFcm) return;

    (async () => {
      try {
        await registerPushToken(jwt, fcmToken);
        console.log("✅ FCM token registrado en backend");
      } catch (e) {
        console.error("❌ Error registrando FCM en backend:", e);
      }
    })();
  }, [hasJwt, hasFcm, jwt, fcmToken]);

  // ✅ Debe ejecutarse por click sí o sí
  const pedirPermisoNotificaciones = async () => {
    setError(null);
    try {
      const token = await activarNotificaciones();
      setFcmToken(token);
      localStorage.setItem("fcm_token", token);

      // si ya estás logueado, lo registra al toque
      if (hasJwt) {
        await registerPushToken(jwt, token);
        console.log("✅ Registrado al backend (post-click)");
      }

      alert("Notificaciones activadas ✅");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error activando notificaciones");
      alert("Error activando notificaciones");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const emailClean = email.trim().toLowerCase();

      const data = await login(emailClean); // guarda token en localStorage
      const token = data?.token || localStorage.getItem("token") || "";
      setJwt(token);

      // si ya tenés fcmToken del celu/pc, registra ahora
      if (token && fcmToken) {
        await registerPushToken(token, fcmToken);
      }

      onLoggedIn();
    } catch (err: any) {
      console.error(err);
      setError("No se pudo iniciar sesión. Verificá el correo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-semibold text-center mb-2">
          Ranking Pádel – Panel Web
        </h1>

        <p className="text-xs text-slate-500 text-center mb-6">
          Iniciá sesión con tu correo real (el que está cargado en el sistema).
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">
              len: {email.length}
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando…" : "Entrar"}
          </button>

          <button
            type="button"
            onClick={pedirPermisoNotificaciones}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Activar notificaciones
          </button>

          {(hasFcm || hasJwt) && (
            <div className="pt-2 space-y-1">
              {hasJwt && (
                <p className="text-[10px] text-slate-500 text-center break-all">
                  ✅ JWT listo: {jwt.slice(0, 20)}...
                </p>
              )}
              {hasFcm && (
                <p className="text-[10px] text-slate-500 text-center break-all">
                  ✅ FCM listo: {fcmToken.slice(0, 25)}...
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
