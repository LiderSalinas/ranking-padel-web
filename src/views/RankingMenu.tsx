// src/views/RankingMenu.tsx
import React from "react";
import { MdEmojiEvents } from "react-icons/md";

type Genero = "M" | "F";
type Grupo = "A" | "B" | "C";

type Props = {
  onSelect: (f: { genero: Genero; grupo: Grupo }) => void;
};

function colorPorGrupo(grupo: Grupo) {
  if (grupo === "A") return "#F4B400"; // dorado
  if (grupo === "B") return "#B0BEC5"; // plateado
  return "#CD7F32"; // bronce
}

const Row: React.FC<{
  title: string;
  subtitle: string;
  grupo: Grupo;
  onClick: () => void;
}> = ({ title, subtitle, grupo, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition text-left"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
        <MdEmojiEvents size={26} color={colorPorGrupo(grupo)} />
      </span>

      <div className="flex-1">
        <div className="text-[13px] font-semibold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>
      </div>

      <span className="text-slate-300 text-2xl leading-none">›</span>
    </button>
  );
};

const RankingMenu: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-100 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header estilo AppSheet */}
        <header className="mb-4">
          <div className="border-l-4 border-blue-700 pl-3">
            <h2 className="text-[26px] font-extrabold text-left text-slate-900 tracking-tight leading-tight">
              Ranking
            </h2>

            <p className="text-sm text-left text-slate-500 mt-1 font-semibold">
              Selecciona el grupo de clasificación. Se muestran posiciones por pareja.
            </p>
          </div>
        </header>

        <div className="space-y-5">
          <section>
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              Masculino
            </h3>
            <div className="space-y-3">
              <Row
                title="Ranking Masculino A"
                subtitle="Masculino"
                grupo="A"
                onClick={() => onSelect({ genero: "M", grupo: "A" })}
              />
              <Row
                title="Ranking Masculino B"
                subtitle="Masculino"
                grupo="B"
                onClick={() => onSelect({ genero: "M", grupo: "B" })}
              />
              <Row
                title="Ranking Masculino C"
                subtitle="Masculino"
                grupo="C"
                onClick={() => onSelect({ genero: "M", grupo: "C" })}
              />
            </div>
          </section>

          <section>
            <h3 className="text-[13px] font-semibold text-slate-700 mb-2">
              Femenino
            </h3>
            <div className="space-y-3">
              <Row
                title="Ranking Femenino A"
                subtitle="Femenino"
                grupo="A"
                onClick={() => onSelect({ genero: "F", grupo: "A" })}
              />
              <Row
                title="Ranking Femenino B"
                subtitle="Femenino"
                grupo="B"
                onClick={() => onSelect({ genero: "F", grupo: "B" })}
              />
              <Row
                title="Ranking Femenino C"
                subtitle="Femenino"
                grupo="C"
                onClick={() => onSelect({ genero: "F", grupo: "C" })}
              />
            </div>

            <p className="text-[11px] text-slate-400 mt-3">
              Nota: si tu backend todavía no separa por género, por ahora se filtrará
              solo por grupo.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RankingMenu;
