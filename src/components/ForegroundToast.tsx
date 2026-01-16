import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
  onClick?: () => void; // opcional
};

export default function ForegroundToast({ open, title, body, onClose, onClick }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        left: 14,
        right: 14,
        zIndex: 99999,
        maxWidth: 560,
        margin: "0 auto",
        background: "#111A2E",
        border: "1px solid #22304A",
        color: "#EAF0FF",
        borderRadius: 16,
        padding: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        cursor: onClick ? "pointer" : "default",
      }}
      role="alert"
      onClick={onClick}
      title={onClick ? "Abrir" : ""}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
            {title}
          </div>
          <div
            style={{
              opacity: 0.85,
              fontSize: 12,
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={body}
          >
            {body}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "#9FB0D0",
            fontSize: 18,
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
          }}
          aria-label="Cerrar"
          title="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
