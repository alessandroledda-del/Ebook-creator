import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Feather,
  Sparkles,
  Users,
  Image as ImageIcon,
  BookOpen,
  ArrowRight,
  Wand2,
  Share2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { BOOK_MOCKUP, CHAR_PLACEHOLDER } from "@/components/book/media";

const MODELS = ["Claude Sonnet 4.5", "GPT-5.2", "Gemini Nano Banana", "GPT Image 1"];

const STEPS = [
  { n: "01", icon: Wand2, title: "Scrivi un'idea", text: "Anche una sola frase. È tutto ciò che serve per iniziare." },
  { n: "02", icon: BookOpen, title: "L'AI scrive il libro", text: "Trama, capitoli e personaggi sviluppati in italiano, capitolo per capitolo." },
  { n: "03", icon: Share2, title: "Pubblica e condividi", text: "Genera la copertina, scarica il PDF o crea un link pubblico." },
];

const FEATURES = [
  { icon: Sparkles, title: "Dall'idea alla trama", text: "Titolo, sinossi e capitoli completi generati automaticamente." },
  { icon: Users, title: "Personaggi su misura", text: "Nomi, abilità, punti di forza e debolezza, con ritratti AI." },
  { icon: ImageIcon, title: "Copertine d'autore", text: "Crea copertine con Nano Banana o GPT Image 1, anche da un'immagine guida." },
  { icon: BookOpen, title: "Lettura ed export", text: "Veste tipografica curata, export PDF e condivisione pubblica." },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] overflow-x-hidden">
      {/* Header */}
      <header className="relative z-20 max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Feather className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
          <span className="font-serif text-2xl tracking-tight">Libroteca</span>
        </div>
        <button
          onClick={() => navigate("/login")}
          data-testid="header-login-btn"
          className="bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-5 py-2.5 text-sm font-medium transition-colors duration-300"
        >
          Accedi
        </button>
      </header>

      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 80% at 85% 0%, rgba(114,47,55,0.10), transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(114,47,55,0.05), transparent 50%)",
          }}
        />
        <div className="grain-overlay -z-10" />

        <div className="max-w-6xl mx-auto px-6 pt-12 pb-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 border border-[#E7E5E4] bg-white/60 backdrop-blur rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#722F37]" />
              <span className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold">
                Casa editrice intelligente
              </span>
            </div>
            <h1 className="font-serif text-5xl lg:text-7xl tracking-tight leading-[1.02]">
              Da una semplice idea, un{" "}
              <span className="italic text-[#722F37]">libro</span> intero.
            </h1>
            <p className="text-base lg:text-lg text-[#57534E] leading-relaxed mt-7 max-w-lg">
              Inserisci la tua idea: l&apos;intelligenza artificiale costruisce la trama, scrive i
              capitoli, dà vita ai personaggi e disegna la copertina. Tutto in italiano.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <button
                onClick={() => navigate("/login")}
                data-testid="hero-start-btn"
                className="group inline-flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-8 py-4 font-medium transition-all duration-300 hover:-translate-y-0.5"
              >
                Inizia a scrivere
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
              </button>
              <span className="text-sm text-[#57534E]">Email o Google · 15 crediti omaggio</span>
            </div>
          </motion.div>

          {/* Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative mx-auto w-[300px]">
              <div className="relative animate-float">
                <img
                  src={BOOK_MOCKUP}
                  alt="Anteprima libro"
                  className="book-3d relative w-[300px] h-[420px] object-cover rounded-sm"
                />
              </div>

              {/* floating chapter card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute -left-20 top-10 w-52 bg-white border border-[#E7E5E4] rounded-sm shadow-xl p-4"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-1">Capitolo 1</p>
                <p className="font-serif text-base text-[#1C1917] leading-snug">La scoperta nel meccanismo</p>
                <div className="mt-3 space-y-1.5">
                  <span className="block h-1.5 rounded-full bg-[#E7E5E4]" />
                  <span className="block h-1.5 rounded-full bg-[#E7E5E4] w-5/6" />
                  <span className="block h-1.5 rounded-full bg-[#E7E5E4] w-2/3" />
                </div>
              </motion.div>

              {/* floating character chip */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="absolute -right-12 bottom-8 flex items-center gap-3 bg-white border border-[#E7E5E4] rounded-sm shadow-xl p-3 pr-5"
              >
                <img src={CHAR_PLACEHOLDER} alt="" className="w-11 h-11 rounded-sm object-cover" />
                <div>
                  <p className="font-serif text-sm text-[#1C1917] leading-tight">Tobia</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#722F37] font-semibold">Protagonista</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Trust strip */}
        <div className="border-y border-[#E7E5E4] bg-white/70 backdrop-blur">
          <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <span className="text-xs uppercase tracking-[0.2em] text-[#57534E]">Potenziato da</span>
            {MODELS.map((m) => (
              <span key={m} className="font-serif text-lg text-[#1C1917]">{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Come funziona */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-xl mb-16">
          <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-4">Come funziona</p>
          <h2 className="font-serif text-4xl lg:text-5xl tracking-tight leading-tight">
            Tre passi tra te e il tuo <span className="italic text-[#722F37]">romanzo</span>.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-[#E7E5E4] border border-[#E7E5E4] rounded-sm overflow-hidden">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-mono text-sm text-[#722F37]">{s.n}</span>
                <s.icon className="w-6 h-6 text-[#722F37]" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl tracking-tight mb-3">{s.title}</h3>
              <p className="text-sm text-[#57534E] leading-relaxed">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-y border-[#E7E5E4]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-14">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-sm bg-[#F5F3EC] mb-5">
                  <f.icon className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl tracking-tight mb-2">{f.title}</h3>
                <p className="text-sm text-[#57534E] leading-relaxed">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative bg-[#722F37] text-white overflow-hidden">
        <div className="grain-overlay opacity-[0.06]" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <Feather className="w-8 h-8 mx-auto mb-6 text-white/80" strokeWidth={1.5} />
          <h2 className="font-serif text-4xl lg:text-5xl tracking-tight leading-tight">
            Pronto a pubblicare la tua prima storia?
          </h2>
          <p className="text-white/80 mt-5 max-w-md mx-auto">
            Crea il tuo account e ricevi 15 crediti omaggio per dare vita al primo libro.
          </p>
          <button
            onClick={() => navigate("/login")}
            data-testid="cta-start-btn"
            className="group inline-flex items-center gap-2 mt-10 bg-[#FDFBF7] text-[#722F37] hover:bg-white rounded-sm px-8 py-4 font-medium transition-all duration-300 hover:-translate-y-0.5"
          >
            Inizia gratis
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#57534E]">
        <div className="flex items-center gap-2">
          <Feather className="w-4 h-4 text-[#722F37]" strokeWidth={1.5} />
          <span className="font-serif text-lg text-[#1C1917]">Libroteca</span>
        </div>
        <span>La tua casa editrice personale, potenziata dall&apos;AI.</span>
      </footer>
    </div>
  );
}
