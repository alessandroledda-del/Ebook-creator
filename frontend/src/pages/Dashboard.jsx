import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PenLine, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { BookCard } from "@/components/library/BookCard";
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

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-10">
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

        {loading ? (
          <p className="text-[#57534E]">Caricamento...</p>
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
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="books-grid">
            {books.map((book, i) => (
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
