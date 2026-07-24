import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PenLine, Sparkles, Search, Library, BookOpen, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import { BookCard } from "@/components/library/BookCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Dashboard() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("tutti");
  const [sort, setSort] = useState("recenti");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/books");
      setBooks(res.data);
    } catch {
      toast.error("Impossibile caricare la libreria");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    const id = toDelete;
    setToDelete(null);
    try {
      await api.delete(`/books/${id}`);
      setBooks((b) => b.filter((x) => x.id !== id));
      toast.success("Libro eliminato");
    } catch {
      toast.error("Eliminazione fallita");
    }
  };

  const stats = useMemo(() => {
    const chapters = books.reduce((s, b) => s + (b.num_capitoli || 0), 0);
    const done = books.filter((b) => b.status === "completato").length;
    return { total: books.length, chapters, done };
  }, [books]);

  const genres = useMemo(
    () => [...new Set(books.map((b) => b.genere).filter(Boolean))],
    [books]
  );

  const visibleBooks = useMemo(() => {
    let list = [...books];
    if (genre !== "tutti") list = list.filter((b) => b.genere === genre);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((b) =>
        [b.titolo, b.sinossi, b.idea, b.genere]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(q))
      );
    }
    if (sort === "titolo") {
      list.sort((a, b) => (a.titolo || "").localeCompare(b.titolo || "", "it"));
    } else {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    return list;
  }, [books, genre, query, sort]);

  const STAT_ITEMS = [
    { icon: Library, label: "Libri", value: stats.total },
    { icon: BookOpen, label: "Capitoli", value: stats.chapters },
    { icon: CheckCircle2, label: "Completati", value: stats.done },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-2">
              La tua libreria
            </p>
            <h1 className="font-serif text-4xl lg:text-5xl tracking-tight text-[#1C1917]">
              I tuoi <span className="italic text-[#722F37]">libri</span>
            </h1>
          </div>
          <button
            onClick={() => navigate("/crea")}
            data-testid="dashboard-new-book-btn"
            className="flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-5 py-3 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5"
          >
            <PenLine className="w-4 h-4" strokeWidth={1.5} /> Nuovo libro
          </button>
        </div>

        {/* Stats strip */}
        {!loading && books.length > 0 && (
          <div className="grid grid-cols-3 gap-px bg-[#E7E5E4] border border-[#E7E5E4] rounded-sm overflow-hidden mb-8" data-testid="library-stats">
            {STAT_ITEMS.map((s) => (
              <div key={s.label} className="bg-white p-5 flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-[#F5F3EC] shrink-0">
                  <s.icon className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-serif text-2xl text-[#1C1917] leading-none">{s.value}</p>
                  <p className="text-xs uppercase tracking-wider text-[#57534E] mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search & filters */}
        {!loading && books.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57534E]" strokeWidth={1.5} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-testid="library-search-input"
                placeholder="Cerca per titolo, trama o genere…"
                className="bg-transparent border-0 border-b-2 border-[#E7E5E4] rounded-none focus-visible:ring-0 focus:border-[#722F37] pl-6"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap" data-testid="genre-filters">
              <button
                onClick={() => setGenre("tutti")}
                data-testid="genre-filter-tutti"
                className={`text-xs px-3 py-1.5 rounded-sm border transition-colors ${
                  genre === "tutti"
                    ? "bg-[#722F37] border-[#722F37] text-white"
                    : "border-[#E7E5E4] text-[#57534E] hover:border-[#722F37]"
                }`}
              >
                Tutti
              </button>
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`text-xs px-3 py-1.5 rounded-sm border transition-colors ${
                    genre === g
                      ? "bg-[#722F37] border-[#722F37] text-white"
                      : "border-[#E7E5E4] text-[#57534E] hover:border-[#722F37]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              data-testid="library-sort-select"
              className="text-sm bg-transparent border-b-2 border-[#E7E5E4] focus:border-[#722F37] focus:outline-none py-2 text-[#1C1917] cursor-pointer"
            >
              <option value="recenti">Più recenti</option>
              <option value="titolo">Titolo A-Z</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="books-loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white border border-[#E7E5E4] rounded-sm overflow-hidden">
                <Skeleton className="aspect-[3/4] w-full rounded-none bg-[#F0EEE7]" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-24 bg-[#F0EEE7]" />
                  <Skeleton className="h-6 w-3/4 bg-[#F0EEE7]" />
                  <Skeleton className="h-4 w-full bg-[#F0EEE7]" />
                  <Skeleton className="h-4 w-2/3 bg-[#F0EEE7]" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="border border-dashed border-[#E7E5E4] rounded-sm bg-white py-24 text-center">
            <Sparkles className="w-8 h-8 text-[#722F37] mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="font-serif text-2xl mb-2">La tua libreria è vuota</h3>
            <p className="text-sm text-[#57534E] mb-6">Inizia trasformando un&apos;idea nel tuo primo libro.</p>
            <button
              onClick={() => navigate("/crea")}
              data-testid="empty-create-btn"
              className="bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3 text-sm font-medium transition-colors"
            >
              Crea il tuo primo libro
            </button>
          </div>
        ) : visibleBooks.length === 0 ? (
          <div className="border border-dashed border-[#E7E5E4] rounded-sm bg-white py-20 text-center" data-testid="no-results">
            <Search className="w-7 h-7 text-[#722F37] mx-auto mb-3" strokeWidth={1.5} />
            <h3 className="font-serif text-xl mb-1">Nessun risultato</h3>
            <p className="text-sm text-[#57534E]">Prova a modificare la ricerca o il filtro genere.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="books-grid">
            {visibleBooks.map((book, i) => (
              <BookCard
                key={book.id}
                book={book}
                index={i}
                onOpen={() => navigate(`/book/${book.id}`)}
                onDelete={() => setToDelete(book.id)}
              />
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-[#FDFBF7] border-[#E7E5E4]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Eliminare questo libro?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;operazione è definitiva e non potrà essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="confirm-delete-btn"
              className="bg-[#722F37] hover:bg-[#5C252C] rounded-sm"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
