import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Feather, Shield, Zap, HeartCrack, BookOpen } from "lucide-react";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const BOOK_MOCKUP = "https://static.prod-images.emergentagent.com/jobs/ee7f107e-edbd-4e3f-a701-bf5c98274a64/images/fab09ff9c59861f74d2a04fdbfd3c4ec25a7bd7a732d106285a978b550f21c7a.png";
const CHAR_PLACEHOLDER = "https://static.prod-images.emergentagent.com/jobs/ee7f107e-edbd-4e3f-a701-bf5c98274a64/images/6ec350b1571739a569665c05cf3aed18ea87a18bf664dd34746eca7611f67457.png";

export default function PublicBook() {
  const { publicId } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    api
      .get(`/public/books/${publicId}`)
      .then((r) => setBook(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [publicId]);

  const activeParagraphs = useMemo(() => {
    const text = book?.capitoli?.[activeChapter]?.contenuto || "";
    return text.split(/\n+/).filter(Boolean);
  }, [book, activeChapter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Feather className="w-8 h-8 text-[#722F37] animate-pulse" strokeWidth={1.5} />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] px-6 text-center">
        <Feather className="w-10 h-10 text-[#722F37] mb-4" strokeWidth={1.5} />
        <h1 className="font-serif text-3xl text-[#1C1917] mb-2">Libro non disponibile</h1>
        <p className="text-[#57534E] mb-6">Questo libro non esiste o non è più pubblico.</p>
        <Link to="/" className="text-[#722F37] hover:underline">Vai a Libroteca</Link>
      </div>
    );
  }

  const chapters = book.capitoli || [];
  const characters = book.characters || [];

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-xl border-b border-[#E7E5E4]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Feather className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
            <span className="font-serif text-2xl tracking-tight">Libroteca</span>
          </Link>
          <Link
            to="/"
            data-testid="public-cta"
            className="bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-5 py-2 text-sm font-medium transition-colors"
          >
            Crea il tuo libro
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8 mb-10">
          <img
            src={book.cover_image || BOOK_MOCKUP}
            alt={book.titolo}
            className="w-44 h-60 object-cover rounded-sm shadow-xl shrink-0"
            data-testid="public-cover"
          />
          <div className="flex-1">
            <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-2">
              {book.genere || "Narrativa"}
            </p>
            <h1 className="font-serif text-4xl lg:text-5xl tracking-tight text-[#1C1917]" data-testid="public-title">
              {book.titolo}
            </h1>
            {book.sottotitolo && (
              <p className="font-serif italic text-xl text-[#57534E] mt-2">{book.sottotitolo}</p>
            )}
            <p className="text-base text-[#57534E] leading-relaxed mt-4 max-w-2xl">{book.sinossi}</p>
          </div>
        </div>

        <Tabs defaultValue="lettura">
          <TabsList className="bg-[#F5F3EC] rounded-sm">
            <TabsTrigger value="lettura">Lettura</TabsTrigger>
            <TabsTrigger value="personaggi">Personaggi ({characters.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="lettura" className="mt-8">
            {chapters.length === 0 ? (
              <p className="text-[#57534E]">Nessun capitolo disponibile.</p>
            ) : (
              <div className="grid lg:grid-cols-[260px_1fr] gap-10">
                <aside className="lg:border-r lg:border-[#E7E5E4] lg:pr-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-4">Indice</p>
                  <nav className="space-y-1">
                    {chapters.map((ch, i) => (
                      <button
                        key={`${i}-${ch.titolo}`}
                        onClick={() => setActiveChapter(i)}
                        className={`block w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                          activeChapter === i ? "bg-[#722F37] text-white" : "text-[#57534E] hover:bg-[#F5F3EC]"
                        }`}
                      >
                        <span className="font-mono text-xs mr-2">{String(i + 1).padStart(2, "0")}</span>
                        {ch.titolo}
                      </button>
                    ))}
                  </nav>
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
                  <div className="book-content text-lg text-[#292524] leading-relaxed">
                    {activeParagraphs.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                </motion.article>
              </div>
            )}
          </TabsContent>

          <TabsContent value="personaggi" className="mt-8">
            {characters.length === 0 ? (
              <p className="text-[#57534E]">Nessun personaggio.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {characters.map((c) => (
                  <div key={c.id} className="bg-white border border-[#E7E5E4] rounded-sm p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={c.immagine || CHAR_PLACEHOLDER}
                        alt={c.nome}
                        className="w-16 h-16 rounded-sm object-cover bg-[#F5F3EC] shrink-0"
                      />
                      <div>
                        <h3 className="font-serif text-2xl text-[#1C1917] leading-tight">{c.nome}</h3>
                        {c.ruolo && <p className="text-xs uppercase tracking-wider text-[#722F37] font-semibold mt-1">{c.ruolo}</p>}
                      </div>
                    </div>
                    {c.descrizione && <p className="text-sm text-[#57534E] leading-relaxed mt-4">{c.descrizione}</p>}
                    <div className="grid grid-cols-1 gap-px bg-[#E7E5E4] border border-[#E7E5E4] rounded-sm mt-4 overflow-hidden">
                      {c.abilita && (
                        <div className="bg-white p-3">
                          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#722F37] font-semibold mb-1"><Zap className="w-3 h-3" strokeWidth={2} /> Abilità</p>
                          <p className="text-sm text-[#292524]">{c.abilita}</p>
                        </div>
                      )}
                      {c.punti_forza && (
                        <div className="bg-white p-3">
                          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#722F37] font-semibold mb-1"><Shield className="w-3 h-3" strokeWidth={2} /> Punti di forza</p>
                          <p className="text-sm text-[#292524]">{c.punti_forza}</p>
                        </div>
                      )}
                      {c.punti_debolezza && (
                        <div className="bg-white p-3">
                          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#722F37] font-semibold mb-1"><HeartCrack className="w-3 h-3" strokeWidth={2} /> Punti di debolezza</p>
                          <p className="text-sm text-[#292524]">{c.punti_debolezza}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-16 border-t border-[#E7E5E4] pt-8 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-[#57534E]">
            <BookOpen className="w-4 h-4 text-[#722F37]" strokeWidth={1.5} />
            Creato con Libroteca — trasforma la tua idea in un libro.
          </p>
        </div>
      </main>
    </div>
  );
}
