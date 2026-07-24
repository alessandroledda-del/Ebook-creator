import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, ScrollText, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

const PRESETS = [
  ["Più lungo", "Riscrivi il capitolo rendendolo più lungo e dettagliato (circa 900-1100 parole)."],
  ["Più breve", "Riscrivi il capitolo in forma più concisa ed essenziale (circa 300-400 parole)."],
  ["Tono più cupo", "Riscrivi il capitolo con un tono più cupo, teso e drammatico."],
  ["Tono più leggero", "Riscrivi il capitolo con un tono più leggero, ironico e brillante."],
  ["Più dialoghi", "Riscrivi il capitolo dando maggiore spazio ai dialoghi tra i personaggi."],
];

export const ChapterReader = ({
  chapters,
  activeChapter,
  setActiveChapter,
  paragraphs,
  riassunto,
  regenerating,
  customInstr,
  setCustomInstr,
  onRegenerate,
}) => {
  const [recapOpen, setRecapOpen] = useState(false);
  if (chapters.length === 0) {
    return <p className="text-[#57534E]">Nessun capitolo disponibile.</p>;
  }
  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-10">
      <aside className="lg:border-r lg:border-[#E7E5E4] lg:pr-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-4">Indice</p>
        <nav className="space-y-1">
          {chapters.map((ch, i) => (
            <button
              key={`${i}-${ch.titolo}`}
              onClick={() => setActiveChapter(i)}
              data-testid={`chapter-nav-${i}`}
              className={`block w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                activeChapter === i ? "bg-[#722F37] text-white" : "text-[#57534E] hover:bg-[#F5F3EC]"
              }`}
            >
              <span className="font-mono text-xs mr-2">{String(i + 1).padStart(2, "0")}</span>
              {ch.titolo}
            </button>
          ))}
        </nav>

        {riassunto && (
          <div className="mt-6 pt-5 border-t border-[#E7E5E4]" data-testid="plot-recap">
            <button
              onClick={() => setRecapOpen((o) => !o)}
              data-testid="plot-recap-toggle"
              className="flex items-center justify-between w-full text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold"
            >
              <span className="flex items-center gap-2">
                <ScrollText className="w-3.5 h-3.5" strokeWidth={2} /> Riepilogo trama
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${recapOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
            </button>
            {recapOpen && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-sm text-[#57534E] leading-relaxed mt-3 italic"
                data-testid="plot-recap-text"
              >
                {riassunto}
              </motion.p>
            )}
          </div>
        )}
      </aside>
      <motion.article
        key={activeChapter}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-[65ch]"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-3">
          Capitolo {activeChapter + 1}
        </p>
        <h2 className="font-serif text-3xl lg:text-4xl tracking-tight text-[#1C1917] mb-8">
          {chapters[activeChapter].titolo}
        </h2>
        <div className="book-content text-lg text-[#292524] leading-relaxed" data-testid="chapter-content">
          {paragraphs.map((p, idx) => (
            <p key={idx}>{p}</p>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[#E7E5E4]" data-testid="regenerate-toolbar">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-4">
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} /> Rigenera questo capitolo
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map(([label, instr]) => (
              <button
                key={label}
                onClick={() => onRegenerate(instr)}
                disabled={regenerating}
                data-testid={`regen-preset-${label}`}
                className="text-sm border border-[#E7E5E4] text-[#1C1917] hover:border-[#722F37] hover:text-[#722F37] rounded-sm px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              data-testid="regen-custom-input"
              value={customInstr}
              onChange={(e) => setCustomInstr(e.target.value)}
              placeholder="Istruzione personalizzata (es. ambienta la scena di notte)"
              className="bg-transparent border-0 border-b-2 border-[#E7E5E4] rounded-none focus-visible:ring-0 focus:border-[#722F37] px-0"
            />
            <button
              onClick={() => onRegenerate(customInstr)}
              disabled={regenerating || !customInstr.trim()}
              data-testid="regen-custom-btn"
              className="shrink-0 flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {regenerating ? (
                <><Sparkles className="w-4 h-4 animate-pulse" strokeWidth={1.5} /> Rigenerazione…</>
              ) : (
                <><RotateCcw className="w-4 h-4" strokeWidth={1.5} /> Rigenera</>
              )}
            </button>
          </div>
        </div>
      </motion.article>
    </div>
  );
};
