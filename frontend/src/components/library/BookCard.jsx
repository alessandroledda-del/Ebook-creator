import { motion } from "framer-motion";
import { Trash2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BOOK_MOCKUP } from "@/components/book/media";

export const BookCard = ({ book, index, onOpen, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.05 }}
    className="group bg-white border border-[#E7E5E4] rounded-sm overflow-hidden card-lift"
    data-testid="book-card"
  >
    <button onClick={onOpen} className="block w-full text-left">
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
          {book.genere && <span className="text-xs text-[#57534E]">{book.genere}</span>}
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
        onClick={onDelete}
        data-testid="delete-book-btn"
        className="flex items-center gap-1.5 text-xs text-[#57534E] hover:text-[#722F37] transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Elimina
      </button>
    </div>
  </motion.div>
);
