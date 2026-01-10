// src/views/Auth/Login.tsx
import React, { useState } from "react";
import { login } from "../../services/auth";
import { activarNotificaciones, registerPushToken } from "../../push";

interface LoginProps {
  onLoggedIn: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (debug opcional) para ver rápidamente si generó token
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // ✅ AGREGADO: activar + registrar token en backend
  const pedirPermisoNotificaciones = async () => {
    setError(null);
    setLoadingPush(true);

    try {
      // 1) Genera token FCM
      const newFcmToken = await activarNotificaciones();
      setFcmToken(newFcmToken);

      // 2) Recupera JWT para autenticar el endpoint /push/token
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        alert("Primero iniciá sesión para poder registrar el token en el backend.");
        return;
      }

      // 3) Registra el token en tu backend (DB)
      await registerPushToken(jwt, newFcmToken);

      console.log("✅ FCM token registrado en backend:", newFcmToken);
      alert("✅ Notificaciones activadas y registradas");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Error activando notificaciones");
    } finally {
      setLoadingPush(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ✅ normalizar email para evitar espacios/mayúsculas (clave en móviles)
      const emailClean = email.trim().toLowerCase();

      await login(emailClean); // ← llama al backend y guarda token
      onLoggedIn(); // ← avisa al App que ya estamos dentro
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

            {/* debug rápido */}
            <p className="text-[10px] text-slate-400 mt-1 text-right">
              len: {email.length}
            </p>
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando…" : "Entrar"}
          </button>

          {/* ✅ Botón para que Chrome muestre el popup y además registre en backend */}
          <button
            type="button"
            onClick={pedirPermisoNotificaciones}
            disabled={loadingPush}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingPush ? "Activando…" : "Activar notificaciones"}
          </button>

          {/* ✅ Debug opcional: muestra token generado (útil en móvil) */}
          {fcmToken && (
            <p className="text-[10px] text-slate-500 text-center break-all">
              ✅ FCM listo: {fcmToken.slice(0, 25)}...
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
