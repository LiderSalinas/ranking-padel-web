// src/views/Auth/Login.tsx
import React, { useState } from "react";
import { login } from "../../services/auth";
import { activarNotificaciones } from "../../push"; // ✅ AGREGADO

interface LoginProps {
  onLoggedIn: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ AGREGADO: debe ejecutarse por click sí o sí
  const pedirPermisoNotificaciones = async () => {
    const token = await activarNotificaciones();
    console.log("🔥 TOKEN:", token);
    alert(token ? token : "No se generó token (aceptaste permiso?)");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ✅ NUEVO: normalizar email para evitar espacios/mayúsculas (clave en móviles)
      const emailClean = email.trim().toLowerCase();

      await login(emailClean); // ← llama al backend y guarda token
      onLoggedIn();            // ← avisa al App que ya estamos dentro
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

              // ✅ NUEVO: evita que el teclado del celu “toque” el email
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}

              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            {/* ✅ OPCIONAL (debug rápido): te muestra si hay espacios raros */}
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

          {/* ✅ AGREGADO: botón para que Chrome muestre el popup */}
          <button
            type="button"
            onClick={pedirPermisoNotificaciones}
            className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Activar notificaciones
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
