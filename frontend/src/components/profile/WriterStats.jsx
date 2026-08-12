import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Feather, Library, BookOpen, Layers, Trophy, Medal, Palette,
  BookOpenCheck, PenLine, Sparkles, Award, Lock,
} from "lucide-react";
import api from "@/lib/api";

const ACHIEVEMENT_ICONS = {
  primo_libro: Feather,
  completato: BookOpenCheck,
  copertina: Palette,
  romanziere: PenLine,
  saga: Layers,
  generi: Sparkles,
  biblioteca: Library,
  prolifico: Trophy,
};

const fmt = (n) => (n || 0).toLocaleString("it-IT");

export const WriterStats = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/auth/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats) return null;

  const CARDS = [
    { icon: PenLine, label: "Parole scritte", value: fmt(stats.total_words) },
    { icon: Library, label: "Libri", value: fmt(stats.total_books) },
    { icon: BookOpen, label: "Capitoli", value: fmt(stats.chapters_written) },
    { icon: Layers, label: "Serie", value: fmt(stats.num_series) },
  ];

  const unlocked = stats.achievements.filter((a) => a.achieved).length;
  const maxGenre = Math.max(1, ...stats.top_genres.map((g) => g.count));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white border border-[#E7E5E4] rounded-sm p-8"
      data-testid="writer-stats"
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-[#F5F3EC]">
          <Medal className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-2xl tracking-tight">Statistiche scrittore</h2>
      </div>
      <p className="text-sm text-[#57534E] mb-6 mt-2">Il tuo percorso da autore, in numeri.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E7E5E4] border border-[#E7E5E4] rounded-sm overflow-hidden mb-8" data-testid="writer-stat-cards">
        {CARDS.map((c) => (
          <div key={c.label} className="bg-white p-4">
            <c.icon className="w-4 h-4 text-[#722F37] mb-2" strokeWidth={1.5} />
            <p className="font-serif text-2xl text-[#1C1917] leading-none">{c.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#57534E] mt-1.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Generi preferiti */}
      {stats.top_genres.length > 0 && (
        <div className="mb-8" data-testid="favorite-genres">
          <p className="text-xs uppercase tracking-[0.15em] text-[#57534E] font-semibold mb-3">
            Generi preferiti
          </p>
          <div className="space-y-2">
            {stats.top_genres.map((g) => (
              <div key={g.genere} className="flex items-center gap-3">
                <span className="text-sm text-[#1C1917] w-32 truncate shrink-0">{g.genere}</span>
                <div className="flex-1 h-2 bg-[#F5F3EC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#722F37] rounded-full transition-all duration-700"
                    style={{ width: `${(g.count / maxGenre) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-[#57534E] w-6 text-right shrink-0">{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traguardi */}
      <div data-testid="achievements">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.15em] text-[#57534E] font-semibold">Traguardi</p>
          <span className="text-xs text-[#57534E]">
            {unlocked} di {stats.achievements.length} sbloccati
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.achievements.map((a) => {
            const Icon = ACHIEVEMENT_ICONS[a.id] || Award;
            return (
              <div
                key={a.id}
                data-testid={`achievement-${a.id}`}
                title={a.descrizione}
                className={`border rounded-sm p-4 text-center transition-colors duration-300 ${
                  a.achieved
                    ? "border-[#722F37]/30 bg-[#722F37]/5"
                    : "border-[#E7E5E4] opacity-50"
                }`}
              >
                <div
                  className={`w-9 h-9 mx-auto flex items-center justify-center rounded-full mb-2 ${
                    a.achieved ? "bg-[#722F37] text-white" : "bg-[#F5F3EC] text-[#A8A29E]"
                  }`}
                >
                  {a.achieved ? (
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                  ) : (
                    <Lock className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </div>
                <p className="font-serif text-sm text-[#1C1917] leading-tight">{a.titolo}</p>
                <p className="text-[10px] text-[#57534E] mt-1 leading-snug">{a.descrizione}</p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
