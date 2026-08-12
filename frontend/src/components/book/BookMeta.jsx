import { Download, Share2, BookMarked, BookPlus } from "lucide-react";
import { BOOK_MOCKUP } from "@/components/book/media";

export const BookMeta = ({ book, downloading, downloadingEpub, onDownload, onDownloadEpub, onShare, onSequel }) => (
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
        {(book.serie_volume || 1) > 1 && (
          <span data-testid="serie-volume-label"> · Volume {book.serie_volume}{book.parent_titolo ? ` · seguito di «${book.parent_titolo}»` : ""}</span>
        )}
      </p>
      <h1 className="font-serif text-4xl lg:text-5xl tracking-tight text-[#1C1917]" data-testid="book-title">
        {book.titolo || "Senza titolo"}
      </h1>
      {book.sottotitolo && (
        <p className="font-serif italic text-xl text-[#57534E] mt-2">{book.sottotitolo}</p>
      )}
      <p className="text-base text-[#57534E] leading-relaxed mt-4 max-w-2xl">{book.sinossi}</p>
      {book.status === "completato" && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={onDownload}
            disabled={downloading}
            data-testid="download-pdf-btn"
            className="inline-flex items-center gap-2 border border-[#722F37] text-[#722F37] hover:bg-[#722F37] hover:text-white rounded-sm px-5 py-2.5 text-sm font-medium transition-colors duration-300 disabled:opacity-60"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} />
            {downloading ? "Preparazione…" : "Scarica PDF"}
          </button>
          <button
            onClick={onDownloadEpub}
            disabled={downloadingEpub}
            data-testid="download-epub-btn"
            className="inline-flex items-center gap-2 border border-[#E7E5E4] text-[#1C1917] hover:border-[#722F37] hover:text-[#722F37] rounded-sm px-5 py-2.5 text-sm font-medium transition-colors duration-300 disabled:opacity-60"
          >
            <BookMarked className="w-4 h-4" strokeWidth={1.5} />
            {downloadingEpub ? "Preparazione…" : "Scarica EPUB"}
          </button>
          <button
            onClick={onShare}
            data-testid="share-book-btn"
            className="inline-flex items-center gap-2 border border-[#E7E5E4] text-[#1C1917] hover:border-[#722F37] hover:text-[#722F37] rounded-sm px-5 py-2.5 text-sm font-medium transition-colors duration-300"
          >
            <Share2 className="w-4 h-4" strokeWidth={1.5} />
            {book.is_public ? "Gestisci condivisione" : "Condividi"}
          </button>
          <button
            onClick={onSequel}
            data-testid="create-sequel-btn"
            className="inline-flex items-center gap-2 border border-[#E7E5E4] text-[#1C1917] hover:border-[#722F37] hover:text-[#722F37] rounded-sm px-5 py-2.5 text-sm font-medium transition-colors duration-300"
          >
            <BookPlus className="w-4 h-4" strokeWidth={1.5} />
            Scrivi il seguito
          </button>
        </div>
      )}
    </div>
  </div>
);
