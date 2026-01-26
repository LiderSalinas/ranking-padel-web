// src/services/api.ts

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").trim();

if (!API_BASE_URL) {
  // Esto hace que sea obvio cuando VITE_API_URL no existe en el build
  throw new Error(
    "Falta VITE_API_URL. Creá un .env(.local) en el frontend o configurá la variable en Vercel."
  );
}

function buildUrl(path: string) {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

// ✅ NUEVO: stringify robusto para detail que puede venir como string | array | object
function stringifyDetail(detail: any): string {
  if (detail == null) return "Error desconocido.";

  if (typeof detail === "string") return detail;

  // Pydantic típico: [{loc, msg, type}, ...]
  if (Array.isArray(detail)) {
    // Si son objetos con msg, los concatenamos
    const msgs = detail
      .map((x) => {
        if (!x) return "";
        if (typeof x === "string") return x;
        if (typeof x?.msg === "string") return x.msg;
        return JSON.stringify(x);
      })
      .filter(Boolean);

    if (msgs.length) return msgs.join(" | ");
    return JSON.stringify(detail);
  }

  if (typeof detail === "object") {
    // a veces viene {message:"..."} o {error:"..."}
    const maybeMsg =
      (detail as any).message ||
      (detail as any).error ||
      (detail as any).detail ||
      null;

    if (typeof maybeMsg === "string") return maybeMsg;

    return JSON.stringify(detail);
  }

  return String(detail);
}

export async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // ✅ NUEVO: si body es FormData NO setear Content-Type (el browser pone el boundary)
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData) {
    (headers as any)["Content-Type"] = (headers as any)["Content-Type"] || "application/json";
  }

  // ✅ Si es ngrok free, evita el HTML warning interstitial
  if (API_BASE_URL.includes("ngrok-free")) {
    (headers as any)["ngrok-skip-browser-warning"] = "true";
  }

  if (token) {
    (headers as any)["Authorization"] = `Bearer ${token}`;
  }

  const resp = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  // Leemos como texto primero para evitar crash si viene HTML
  const raw = await resp.text();
  const contentType = resp.headers.get("content-type") || "";

  // Helper: intenta parsear JSON solo si corresponde
  const tryJson = () => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  if (!resp.ok) {
    // ✅ NUEVO: si es 401, limpiamos token para no quedar trabado
    if (resp.status === 401) {
      try {
        localStorage.removeItem("token");
      } catch {}
    }

    const data = contentType.includes("application/json") ? tryJson() : null;

    // ✅ NUEVO: soporta detail / message / error
    const detail =
      data?.detail != null
        ? stringifyDetail(data.detail)
        : data?.message != null
        ? stringifyDetail(data.message)
        : data?.error != null
        ? stringifyDetail(data.error)
        : raw?.slice(0, 200) || `HTTP ${resp.status}`;

    throw new Error(detail);
  }

  // 204 No Content
  if (resp.status === 204) return undefined as T;

  // Si es JSON, parsea. Si no, devolvé error explícito
  if (contentType.includes("application/json")) {
    const data = tryJson();
    if (data === null) {
      throw new Error("Respuesta inválida: se esperaba JSON pero no se pudo parsear.");
    }
    return data as T;
  }

  // Si te devuelve HTML, te lo cantamos directo
  throw new Error(
    `Respuesta inesperada (no JSON). Content-Type=${contentType}. Body=${raw.slice(0, 120)}`
  );
}
