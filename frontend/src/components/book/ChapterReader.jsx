import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw,
  Sparkles,
  ScrollText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  Sun,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const PRESETS = [
  ["Più lungo", "Riscrivi il capitolo rendendolo più lungo e dettagliato (circa 900-1100 parole)."],
  ["Più breve", "Riscrivi il capitolo in forma più concisa ed essenziale (circa 300-400 parole)."],
  ["Tono più cupo", "Riscrivi il capitolo con un tono più cupo, teso e drammatico."],
  ["Tono più leggero", "Riscrivi il capitolo con un tono più leggero, ironico e brillante."],
  ["Più dialoghi", "Riscrivi il capitolo dando maggiore spazio ai dialoghi tra i personaggi."],
];

const FONT_STEPS = [16, 18, 20, 22, 24];

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
  const [fontIdx, setFontIdx] = useState(1);
  const [sepia, setSepia] = useState(false);
  const [progress, setProgress] = useState(0);

  const wordCount = useMemo(
    () => paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length,
    [paragraphs]
  );
  const readingMin = Math.max(1, Math.round(wordCount / 200));

  const onScroll = useCallback(() => {
    const el = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeChapter]);

  if (chapters.length === 0) {
    return <p className="text-[#57534E]">Nessun capitolo disponibile.</p>;
  }

  const goPrev = () => activeChapter > 0 && setActiveChapter(activeChapter - 1);
  const goNext = () => activeChapter < chapters.length - 1 && setActiveChapter(activeChapter + 1);

  return (
    <>
      {/* reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-transparent" data-testid="reading-progress">
        <div
          className="h-full bg-[#722F37] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

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

        <div>
          {/* reader toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-[#E7E5E4]">
            <div className="flex items-center gap-4 text-xs text-[#57534E]">
              <span className="flex items-center gap-1.5" data-testid="reading-time">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} /> {readingMin} min di lettura
              </span>
              <span className="text-[#E7E5E4]">·</span>
              <span data-testid="word-count">{wordCount.toLocaleString("it-IT")} parole</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
                disabled={fontIdx === 0}
                data-testid="font-decrease-btn"
                className="w-8 h-8 flex items-center justify-center border border-[#E7E5E4] rounded-sm text-[#57534E] hover:border-[#722F37] hover:text-[#722F37] transition-colors disabled:opacity-40"
                aria-label="Riduci testo"
              >
                <Minus className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <span className="font-serif text-sm text-[#57534E]">Aa</span>
              <button
                onClick={() => setFontIdx((i) => Math.min(FONT_STEPS.length - 1, i + 1))}
                disabled={fontIdx === FONT_STEPS.length - 1}
                data-testid="font-increase-btn"
                className="w-8 h-8 flex items-center justify-center border border-[#E7E5E4] rounded-sm text-[#57534E] hover:border-[#722F37] hover:text-[#722F37] transition-colors disabled:opacity-40"
                aria-label="Aumenta testo"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={() => setSepia((s) => !s)}
                data-testid="sepia-toggle-btn"
                className={`ml-1 flex items-center gap-1.5 px-3 h-8 border rounded-sm text-xs font-medium transition-colors ${
                  sepia
                    ? "bg-[#5b4636] border-[#5b4636] text-[#f4ecd8]"
                    : "border-[#E7E5E4] text-[#57534E] hover:border-[#722F37] hover:text-[#722F37]"
                }`}
              >
                <Sun className="w-3.5 h-3.5" strokeWidth={1.5} /> Seppia
              </button>
            </div>
          </div>

          <motion.article
            key={activeChapter}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`rounded-sm transition-colors duration-300 ${
              sepia ? "bg-[#f4ecd8] px-8 py-10 lg:px-14 lg:py-14" : ""
            }`}
          >
            <div className="max-w-[65ch]">
              <p className={`text-xs uppercase tracking-[0.2em] font-semibold mb-3 ${sepia ? "text-[#8a5a44]" : "text-[#722F37]"}`}>
                Capitolo {activeChapter + 1}
              </p>
              <h2 className={`font-serif text-3xl lg:text-4xl tracking-tight mb-8 ${sepia ? "text-[#3d2f22]" : "text-[#1C1917]"}`}>
                {chapters[activeChapter].titolo}
              </h2>
              <div
                className={`book-content leading-relaxed ${sepia ? "text-[#4a3a2a]" : "text-[#292524]"}`}
                style={{ fontSize: `${FONT_STEPS[fontIdx]}px` }}
                data-testid="chapter-content"
              >
                {paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </div>
          </motion.article>

          {/* chapter navigation */}
          <div className="mt-12 flex items-center justify-between gap-4" data-testid="chapter-nav-controls">
            <button
              onClick={goPrev}
              disabled={activeChapter === 0}
              data-testid="prev-chapter-btn"
              className="flex items-center gap-2 text-sm text-[#57534E] hover:text-[#722F37] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> Capitolo precedente
            </button>
            <span className="font-mono text-xs text-[#57534E]">
              {activeChapter + 1} / {chapters.length}
            </span>
            <button
              onClick={goNext}
              disabled={activeChapter === chapters.length - 1}
              data-testid="next-chapter-btn"
              className="flex items-center gap-2 text-sm text-[#57534E] hover:text-[#722F37] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Capitolo successivo <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
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
        </div>
      </div>
    </>
  );
};
