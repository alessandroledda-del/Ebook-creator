import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PenLine, Trash2, BookOpen, Sparkles } from "lucide-react";
import Header from "@/components/Header";
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
import { Badge } from "@/components/ui/badge";

const BOOK_MOCKUP = "https://static.prod-images.emergentagent.com/jobs/ee7f107e-edbd-4e3f-a701-bf5c98274a64/images/fab09ff9c59861f74d2a04fdbfd3c4ec25a7bd7a732d106285a978b550f21c7a.png";

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
            <p className="text-sm text-[#57534E] mb-6">Inizia trasformando un'idea nel tuo primo libro.</p>
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
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group bg-white border border-[#E7E5E4] rounded-sm overflow-hidden hover:shadow-md transition-shadow"
                data-testid="book-card"
              >
                <button
                  onClick={() => navigate(`/book/${book.id}`)}
                  className="block w-full text-left"
                >
                  <div className="aspect-[3/4] bg-[#F5F3EC] overflow-hidden flex items-center justify-center">
                    <img
                      src={book.cover_image || BOOK_MOCKUP}
                      alt={book.titolo}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wider border-[#E7E5E4] ${
                          book.status === "completato" ? "text-[#722F37]" : "text-[#57534E]"
                        }`}
                      >
                        {book.status === "completato" ? "Completato" : "Bozza"}
                      </Badge>
                      {book.genere && (
                        <span className="text-xs text-[#57534E]">{book.genere}</span>
                      )}
                    </div>
                    <h3 className="font-serif text-xl tracking-tight text-[#1C1917] line-clamp-2">
                      {book.titolo || book.idea?.slice(0, 60) || "Senza titolo"}
                    </h3>
                    <p className="text-sm text-[#57534E] mt-2 line-clamp-2 leading-relaxed">
                      {book.sinossi || book.idea}
                    </p>
                    <div className="flex items-center gap-1 mt-4 text-xs text-[#57534E]">
                      <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {book.num_capitoli} capitoli
                    </div>
                  </div>
                </button>
                <div className="px-5 pb-4">
                  <button
                    onClick={() => setToDelete(book.id)}
                    data-testid="delete-book-btn"
                    className="flex items-center gap-1.5 text-xs text-[#57534E] hover:text-[#722F37] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Elimina
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-[#FDFBF7] border-[#E7E5E4]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl">Eliminare questo libro?</AlertDialogTitle>
            <AlertDialogDescription>
              L'operazione è definitiva e non potrà essere annullata.
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
