import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Feather, Plus, UserPlus, Trash2, Wand2, ArrowLeft, BookPlus, X } from "lucide-react";
import Header from "@/components/Header";
import CharacterDialog from "@/components/CharacterDialog";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function CreateBook() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sequelId = searchParams.get("sequel");
  const [parentBook, setParentBook] = useState(null);
  const [idea, setIdea] = useState("");
  const [genere, setGenere] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-5-20250929");
  const [numCapitoli, setNumCapitoli] = useState("5");
  const [tono, setTono] = useState("avvincente e coinvolgente");
  const [lunghezza, setLunghezza] = useState("media");
  const [pov, setPov] = useState("terza");
  const [characters, setCharacters] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });

  useEffect(() => {
    if (!sequelId) {
      setParentBook(null);
      return;
    }
    api
      .get(`/books/${sequelId}`)
      .then((res) => {
        const p = res.data;
        setParentBook(p);
        setGenere(p.genere || "");
        if (p.model) setModel(p.model);
        if (p.tono) setTono(p.tono);
        if (p.lunghezza) setLunghezza(p.lunghezza);
        if (p.pov) setPov(p.pov);
        setCharacters(
          (p.characters || []).map(({ id, immagine, ...rest }) => rest)
        );
      })
      .catch(() => {
        toast.error("Libro precedente non trovato");
        setSearchParams({});
      });
  }, [sequelId, setSearchParams]);

  const removeSequel = () => {
    setParentBook(null);
    setCharacters([]);
    setSearchParams({});
  };

  const addCharacter = (char) => {
    if (editIndex !== null) {
      setCharacters((cs) => cs.map((c, i) => (i === editIndex ? char : c)));
      setEditIndex(null);
    } else {
      setCharacters((cs) => [...cs, char]);
    }
  };

  const openNew = () => {
    setEditIndex(null);
    setDialogOpen(true);
  };
  const openEdit = (i) => {
    setEditIndex(i);
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    if (idea.trim().length < 10) {
      toast.error("Descrivi la tua idea con almeno una frase");
      return;
    }
    setGenerating(true);
    try {
      setProgress({ current: 0, total: 0, label: "Sto immaginando la trama e i personaggi…" });
      const create = await api.post("/books", {
        idea,
        genere,
        model,
        num_capitoli: parseInt(numCapitoli, 10),
        tono,
        lunghezza,
        pov,
        characters,
        parent_book_id: parentBook ? parentBook.id : null,
      });
      const bookId = create.data.id;

      const outline = await api.post(`/books/${bookId}/generate-outline`);
      const chapters = outline.data.capitoli || [];
      const total = chapters.length;

      for (let i = 0; i < total; i++) {
        setProgress({ current: i, total, label: `Scrivo il capitolo: "${chapters[i].titolo}"` });
        await api.post(`/books/${bookId}/generate-chapter`, { index: i });
      }

      setProgress({ current: total, total, label: "Ultimi ritocchi…" });
      await refreshUser();
      toast.success("Il tuo libro è pronto!");
      navigate(`/book/${bookId}`);
    } catch (e) {
      if (e?.response?.status === 402) {
        toast.error("Crediti insufficienti. Acquista crediti per continuare.");
        await refreshUser();
        navigate("/crediti");
        return;
      }
      toast.error("Generazione fallita. Riprova.");
      setGenerating(false);
    }
  };

  const field =
    "bg-transparent border-0 border-b-2 border-[#E7E5E4] rounded-none focus-visible:ring-0 focus:border-[#722F37] px-0";

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />

      {generating && (
        <div className="fixed inset-0 z-[60] bg-[#FDFBF7]/95 backdrop-blur-sm flex flex-col items-center justify-center px-6">
          <Feather className="w-12 h-12 text-[#722F37] animate-pulse mb-6" strokeWidth={1.5} />
          <h2 className="font-serif text-3xl text-[#1C1917] mb-3 text-center">Sto scrivendo il tuo libro…</h2>
          <p className="text-sm text-[#57534E] max-w-sm text-center min-h-[2.5rem]" data-testid="progress-label">
            {progress.label}
          </p>
          {progress.total > 0 && (
            <div className="w-72 mt-5" data-testid="generation-progress">
              <Progress value={(progress.current / progress.total) * 100} className="h-1.5" />
              <p className="text-xs text-[#57534E] mt-3 text-center font-mono">
                Capitolo {Math.min(progress.current + (progress.current < progress.total ? 1 : 0), progress.total)} di {progress.total}
              </p>
            </div>
          )}
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-[#57534E] hover:text-[#722F37] transition-colors mb-8"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Libreria
        </button>

        <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-3">
          {parentBook ? `Nuovo volume · Vol. ${(parentBook.serie_volume || 1) + 1}` : "Nuova opera"}
        </p>
        <h1 className="font-serif text-4xl lg:text-5xl tracking-tight text-[#1C1917] mb-10">
          {parentBook ? (
            <>Come <span className="italic text-[#722F37]">continua</span> la storia?</>
          ) : (
            <>Qual è la tua <span className="italic text-[#722F37]">idea</span>?</>
          )}
        </h1>

        {parentBook && (
          <div
            data-testid="sequel-banner"
            className="flex items-center gap-4 bg-white border border-[#E7E5E4] rounded-sm p-4 mb-10"
          >
            <BookPlus className="w-5 h-5 text-[#722F37] shrink-0" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-[0.15em] text-[#722F37] font-semibold">Seguito di</p>
              <p className="font-serif text-lg text-[#1C1917] truncate">«{parentBook.titolo}»</p>
              <p className="text-xs text-[#57534E] mt-0.5">
                L&apos;AI ricorderà trama e personaggi del volume precedente per garantire continuità.
              </p>
            </div>
            <button
              onClick={removeSequel}
              data-testid="remove-sequel-btn"
              title="Rimuovi collegamento alla serie"
              className="text-[#57534E] hover:text-[#722F37] transition-colors shrink-0"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
          <div>
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">
              {parentBook ? "L'idea del nuovo volume" : "L'idea del libro"}
            </Label>
            <Textarea
              data-testid="idea-input"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={
                parentBook
                  ? "Es. Anni dopo gli eventi del primo volume, una nuova minaccia costringe i protagonisti a..."
                  : "Es. Un'archeologa scopre una città sommersa che esiste solo nei sogni delle persone..."
              }
              rows={4}
              className={`${field} text-lg mt-2 leading-relaxed`}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Genere</Label>
              <Input
                data-testid="genre-input"
                value={genere}
                onChange={(e) => setGenere(e.target.value)}
                placeholder="Fantasy, giallo..."
                className={`${field} mt-2`}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Modello AI</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger data-testid="model-select" className="mt-2 rounded-sm border-[#E7E5E4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5</SelectItem>
                  <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Capitoli</Label>
              <Select value={numCapitoli} onValueChange={setNumCapitoli}>
                <SelectTrigger data-testid="chapters-select" className="mt-2 rounded-sm border-[#E7E5E4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} capitoli
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Tono narrativo</Label>
              <Select value={tono} onValueChange={setTono}>
                <SelectTrigger data-testid="tone-select" className="mt-2 rounded-sm border-[#E7E5E4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avvincente e coinvolgente">Avvincente</SelectItem>
                  <SelectItem value="cupo, teso e drammatico">Cupo e drammatico</SelectItem>
                  <SelectItem value="ironico e brillante">Ironico</SelectItem>
                  <SelectItem value="poetico ed evocativo">Poetico</SelectItem>
                  <SelectItem value="romantico e intimo">Romantico</SelectItem>
                  <SelectItem value="epico e avventuroso">Epico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Lunghezza capitoli</Label>
              <Select value={lunghezza} onValueChange={setLunghezza}>
                <SelectTrigger data-testid="length-select" className="mt-2 rounded-sm border-[#E7E5E4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breve">Breve (~350 parole)</SelectItem>
                  <SelectItem value="media">Media (~650 parole)</SelectItem>
                  <SelectItem value="lunga">Lunga (~1000 parole)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Punto di vista</Label>
              <Select value={pov} onValueChange={setPov}>
                <SelectTrigger data-testid="pov-select" className="mt-2 rounded-sm border-[#E7E5E4]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terza">Terza persona</SelectItem>
                  <SelectItem value="prima">Prima persona</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">
                Personaggi (opzionale)
              </Label>
              <button
                onClick={openNew}
                data-testid="add-character-btn"
                className="flex items-center gap-1.5 text-sm text-[#722F37] hover:underline"
              >
                <UserPlus className="w-4 h-4" strokeWidth={1.5} /> Aggiungi
              </button>
            </div>
            {characters.length === 0 ? (
              <p className="text-sm text-[#57534E] border-b border-[#E7E5E4] pb-4">
                Non hai aggiunto personaggi. L&apos;AI ne creerà di adatti, oppure aggiungili tu.
              </p>
            ) : (
              <div className="space-y-px bg-[#E7E5E4] border border-[#E7E5E4] rounded-sm overflow-hidden">
                {characters.map((c, i) => (
                  <div key={`${i}-${c.nome}`} className="bg-white p-4 flex items-start justify-between" data-testid="character-row">
                    <div>
                      <p className="font-serif text-lg text-[#1C1917]">
                        {c.nome} {c.ruolo && <span className="text-sm text-[#57534E] font-sans">— {c.ruolo}</span>}
                      </p>
                      {c.descrizione && <p className="text-sm text-[#57534E] mt-1 line-clamp-1">{c.descrizione}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <button onClick={() => openEdit(i)} className="text-sm text-[#57534E] hover:text-[#722F37]">
                        Modifica
                      </button>
                      <button
                        onClick={() => setCharacters((cs) => cs.filter((_, idx) => idx !== i))}
                        className="text-[#57534E] hover:text-[#722F37]"
                        data-testid="remove-character-btn"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            data-testid="generate-book-btn"
            className="flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-8 py-4 font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
          >
            <Wand2 className="w-5 h-5" strokeWidth={1.5} /> Genera il libro
          </button>
        </motion.div>
      </main>

      <CharacterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={addCharacter}
        initial={editIndex !== null ? characters[editIndex] : null}
      />
    </div>
  );
}
