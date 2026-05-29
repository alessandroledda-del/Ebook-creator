import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Feather, Sparkles, Users, ImageIcon, BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const INK = "https://static.prod-images.emergentagent.com/jobs/ee7f107e-edbd-4e3f-a701-bf5c98274a64/images/0852456c4fd73e2d2296cb0906e3ea84037a92975fc2ce5ab896f1acfaeb379b.png";

const features = [
  { icon: Sparkles, title: "Dall'idea alla trama", text: "Scrivi una frase. L'AI sviluppa titolo, sinossi e capitoli completi." },
  { icon: Users, title: "Personaggi su misura", text: "Definisci nomi, abilità, punti di forza e debolezza di ogni personaggio." },
  { icon: ImageIcon, title: "Copertine generate", text: "Crea copertine d'autore con Nano Banana o GPT Image 1." },
  { icon: BookOpen, title: "Lettura immersiva", text: "Sfoglia il tuo libro in una veste tipografica curata." },
];

export default function Landing() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Feather className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
          <span className="font-serif text-2xl tracking-tight">Libroteca</span>
        </div>
        <button
          onClick={login}
          data-testid="header-login-btn"
          className="bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-5 py-2 text-sm font-medium transition-colors duration-300"
        >
          Accedi
        </button>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-6">
            Casa editrice intelligente
          </p>
          <h1 className="font-serif text-5xl lg:text-6xl tracking-tight text-[#1C1917] leading-[1.05]">
            Trasforma una semplice idea in un{" "}
            <span className="italic text-[#722F37]">libro</span> completo.
          </h1>
          <p className="text-base text-[#57534E] leading-relaxed mt-6 max-w-md">
            Inserisci la tua idea: l'intelligenza artificiale costruisce la trama, scrive i
            capitoli, dà vita ai personaggi e disegna la copertina. Tutto in italiano.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={login}
              data-testid="hero-start-btn"
              className="bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-7 py-3.5 font-medium transition-all duration-300 hover:-translate-y-0.5"
            >
              Inizia a scrivere
            </button>
            <span className="text-sm text-[#57534E]">Accesso con Google</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="relative hidden lg:block"
        >
          <img src={INK} alt="" className="w-full max-w-md mx-auto mix-blend-multiply" />
        </motion.div>
      </section>

      <section className="border-t border-[#E7E5E4] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#E7E5E4]">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-white p-8"
            >
              <f.icon className="w-6 h-6 text-[#722F37] mb-4" strokeWidth={1.5} />
              <h3 className="font-serif text-xl tracking-tight mb-2">{f.title}</h3>
              <p className="text-sm text-[#57534E] leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm text-[#57534E]">
        Libroteca — La tua casa editrice personale, potenziata dall'AI.
      </footer>
    </div>
  );
}
