import { motion } from "framer-motion";
import { Layers, BookOpen } from "lucide-react";
import { BOOK_MOCKUP } from "@/components/book/media";

export const SeriesShelf = ({ series, onOpen }) => (
  <section className="mb-12" data-testid="series-section">
    <div className="flex items-center gap-2 mb-5">
      <Layers className="w-4 h-4 text-[#722F37]" strokeWidth={1.5} />
      <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold">
        Le tue serie
      </p>
    </div>
    <div className="space-y-6">
      {series.map((volumes, si) => (
        <motion.div
          key={volumes[0].id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: si * 0.08 }}
          className="bg-white border border-[#E7E5E4] rounded-sm p-6"
          data-testid={`series-shelf-${si}`}
        >
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h3 className="font-serif text-2xl tracking-tight text-[#1C1917] truncate">
              Saga di «{volumes[0].titolo || "Senza titolo"}»
            </h3>
            <span className="text-xs uppercase tracking-wider text-[#57534E] shrink-0">
              {volumes.length} volumi
            </span>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {volumes.map((v) => (
              <button
                key={v.id}
                onClick={() => onOpen(v.id)}
                data-testid={`series-volume-${v.id}`}
                className="group w-32 shrink-0 text-left"
              >
                <div className="relative overflow-hidden rounded-sm border border-[#E7E5E4] shadow-md transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
                  <img
                    src={v.cover_image || BOOK_MOCKUP}
                    alt={v.titolo}
                    className="w-32 h-44 object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-[#722F37] text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                    Vol. {v.serie_volume || 1}
                  </span>
                </div>
                <p className="font-serif text-sm text-[#1C1917] mt-2 line-clamp-2 leading-snug">
                  {v.titolo || "Senza titolo"}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-[#57534E] mt-1">
                  <BookOpen className="w-3 h-3" strokeWidth={1.5} />
                  {v.status === "completato" ? "Completato" : "In scrittura"}
                </p>
              </button>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);
