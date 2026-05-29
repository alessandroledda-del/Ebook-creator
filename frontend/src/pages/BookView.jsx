import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Feather,
  UserPlus,
  Trash2,
  Pencil,
  ImagePlus,
  Sparkles,
  Shield,
  Zap,
  HeartCrack,
} from "lucide-react";
import Header from "@/components/Header";
import CharacterDialog from "@/components/CharacterDialog";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BOOK_MOCKUP = "https://static.prod-images.emergentagent.com/jobs/ee7f107e-edbd-4e3f-a701-bf5c98274a64/images/fab09ff9c59861f74d2a04fdbfd3c4ec25a7bd7a732d106285a978b550f21c7a.png";
const CHAR_PLACEHOLDER = "https://static.prod-images.emergentagent.com/jobs/ee7f107e-edbd-4e3f-a701-bf5c98274a64/images/6ec350b1571739a569665c05cf3aed18ea87a18bf664dd34746eca7611f67457.png";

export default function BookView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);

  // character dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editChar, setEditChar] = useState(null);

  // cover
  const [coverModel, setCoverModel] = useState("gemini-nano-banana");
  const [coverStyle, setCoverStyle] = useState("elegante e cinematografico");
  const [coverLoading, setCoverLoading] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/books/${id}`);
      setBook(res.data);
    } catch {
      toast.error("Libro non trovato");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveCharacter = async (char) => {
    try {
      if (editChar) {
        await api.put(`/books/${id}/characters/${editChar.id}`, char);
      } else {
        await api.post(`/books/${id}/characters`, char);
      }
      toast.success("Personaggio salvato");
      setEditChar(null);
      load();
    } catch {
      toast.error("Salvataggio non riuscito");
    }
  };

  const deleteCharacter = async (charId) => {
    try {
      await api.delete(`/books/${id}/characters/${charId}`);
      load();
    } catch {
      toast.error("Eliminazione non riuscita");
    }
  };

  const generateCover = async () => {
    setCoverLoading(true);
    try {
      const res = await api.post(`/books/${id}/cover`, { model: coverModel, style: coverStyle });
      setBook((b) => ({ ...b, cover_image: res.data.cover_image, cover_model: res.data.cover_model }));
      toast.success("Copertina generata!");
    } catch {
      toast.error("Generazione copertina fallita");
    } finally {
      setCoverLoading(false);
    }
  };

  if (loading || !book) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Feather className="w-8 h-8 text-[#722F37] animate-pulse" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  const chapters = book.capitoli || [];
  const characters = book.characters || [];

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-[#57534E] hover:text-[#722F37] transition-colors mb-8"
          data-testid="back-to-library-btn"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Libreria
        </button>

        <div className="flex flex-col lg:flex-row gap-8 mb-10">
          <img
            src={book.cover_image || BOOK_MOCKUP}
            alt={book.titolo}
            className="w-40 h-56 object-cover rounded-sm shadow-xl shrink-0"
            data-testid="book-cover-image"
          />
          <div className="flex-1">
            <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-2">
              {book.genere || "Narrativa"}
            </p>
            <h1 className="font-serif text-4xl lg:text-5xl tracking-tight text-[#1C1917]" data-testid="book-title">
              {book.titolo || "Senza titolo"}
            </h1>
            {book.sottotitolo && (
              <p className="font-serif italic text-xl text-[#57534E] mt-2">{book.sottotitolo}</p>
            )}
            <p className="text-base text-[#57534E] leading-relaxed mt-4 max-w-2xl">{book.sinossi}</p>
          </div>
        </div>

        <Tabs defaultValue="lettura">
          <TabsList className="bg-[#F5F3EC] rounded-sm">
            <TabsTrigger value="lettura" data-testid="tab-lettura">Lettura</TabsTrigger>
            <TabsTrigger value="personaggi" data-testid="tab-personaggi">
              Personaggi ({characters.length})
            </TabsTrigger>
            <TabsTrigger value="copertina" data-testid="tab-copertina">Copertina</TabsTrigger>
          </TabsList>

          {/* LETTURA */}
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
                        key={i}
                        onClick={() => setActiveChapter(i)}
                        data-testid={`chapter-nav-${i}`}
                        className={`block w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                          activeChapter === i
                            ? "bg-[#722F37] text-white"
                            : "text-[#57534E] hover:bg-[#F5F3EC]"
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
                  <div className="book-content text-lg text-[#292524] leading-relaxed" data-testid="chapter-content">
                    {chapters[activeChapter].contenuto
                      .split(/\n+/)
                      .filter(Boolean)
                      .map((p, idx) => (
                        <p key={idx}>{p}</p>
                      ))}
                  </div>
                </motion.article>
              </div>
            )}
          </TabsContent>

          {/* PERSONAGGI */}
          <TabsContent value="personaggi" className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-[#1C1917]">Dossier dei personaggi</h2>
              <button
                onClick={() => {
                  setEditChar(null);
                  setDialogOpen(true);
                }}
                data-testid="add-character-btn"
                className="flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-4 py-2 text-sm font-medium transition-colors"
              >
                <UserPlus className="w-4 h-4" strokeWidth={1.5} /> Aggiungi
              </button>
            </div>

            {characters.length === 0 ? (
              <p className="text-[#57534E]">Nessun personaggio. Aggiungine uno.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6" data-testid="characters-grid">
                {characters.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-[#E7E5E4] rounded-sm p-6"
                    data-testid="character-card"
                  >
                    <div className="flex items-start gap-4">
                      <img src={CHAR_PLACEHOLDER} alt="" className="w-14 h-14 rounded-sm object-cover bg-[#F5F3EC]" />
                      <div className="flex-1">
                        <h3 className="font-serif text-2xl text-[#1C1917] leading-tight">{c.nome}</h3>
                        {c.ruolo && <p className="text-xs uppercase tracking-wider text-[#722F37] font-semibold mt-1">{c.ruolo}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditChar(c);
                            setDialogOpen(true);
                          }}
                          className="text-[#57534E] hover:text-[#722F37]"
                          data-testid="edit-character-btn"
                        >
                          <Pencil className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => deleteCharacter(c.id)}
                          className="text-[#57534E] hover:text-[#722F37]"
                          data-testid="delete-character-btn"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                    {c.descrizione && <p className="text-sm text-[#57534E] leading-relaxed mt-4">{c.descrizione}</p>}
                    <div className="grid grid-cols-1 gap-px bg-[#E7E5E4] border border-[#E7E5E4] rounded-sm mt-4 overflow-hidden">
                      {c.abilita && (
                        <div className="bg-white p-3">
                          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#722F37] font-semibold mb-1">
                            <Zap className="w-3 h-3" strokeWidth={2} /> Abilità
                          </p>
                          <p className="text-sm text-[#292524]">{c.abilita}</p>
                        </div>
                      )}
                      {c.punti_forza && (
                        <div className="bg-white p-3">
                          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#722F37] font-semibold mb-1">
                            <Shield className="w-3 h-3" strokeWidth={2} /> Punti di forza
                          </p>
                          <p className="text-sm text-[#292524]">{c.punti_forza}</p>
                        </div>
                      )}
                      {c.punti_debolezza && (
                        <div className="bg-white p-3">
                          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#722F37] font-semibold mb-1">
                            <HeartCrack className="w-3 h-3" strokeWidth={2} /> Punti di debolezza
                          </p>
                          <p className="text-sm text-[#292524]">{c.punti_debolezza}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* COPERTINA */}
          <TabsContent value="copertina" className="mt-8">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="flex justify-center">
                <img
                  src={book.cover_image || BOOK_MOCKUP}
                  alt="Copertina"
                  className="w-64 h-[22rem] object-cover rounded-sm shadow-xl"
                  data-testid="cover-preview"
                />
              </div>
              <div>
                <h2 className="font-serif text-2xl text-[#1C1917] mb-2">Genera la copertina</h2>
                <p className="text-sm text-[#57534E] mb-8">
                  Scegli il motore di generazione e lo stile visivo. La copertina viene creata
                  dalla trama del libro.
                </p>
                <div className="space-y-8">
                  <div>
                    <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Motore</Label>
                    <Select value={coverModel} onValueChange={setCoverModel}>
                      <SelectTrigger data-testid="cover-model-select" className="mt-2 rounded-sm border-[#E7E5E4]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-nano-banana">Gemini Nano Banana</SelectItem>
                        <SelectItem value="gpt-image-1">GPT Image 1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Stile visivo</Label>
                    <Input
                      data-testid="cover-style-input"
                      value={coverStyle}
                      onChange={(e) => setCoverStyle(e.target.value)}
                      className="bg-transparent border-0 border-b-2 border-[#E7E5E4] rounded-none focus-visible:ring-0 focus:border-[#722F37] px-0 mt-2"
                    />
                  </div>
                  <button
                    onClick={generateCover}
                    disabled={coverLoading}
                    data-testid="generate-cover-btn"
                    className="flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3 font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {coverLoading ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-pulse" strokeWidth={1.5} /> Generazione…
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-5 h-5" strokeWidth={1.5} /> Genera copertina
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <CharacterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={saveCharacter}
        initial={editChar}
      />
    </div>
  );
}
