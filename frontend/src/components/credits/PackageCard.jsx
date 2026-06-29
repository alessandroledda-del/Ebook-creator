import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export const PackageCard = ({ pkg, index, tag, loading, onBuy }) => {
  const featured = pkg.id === "plus";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={`relative bg-white border rounded-sm p-8 flex flex-col ${
        featured ? "border-[#722F37] shadow-md" : "border-[#E7E5E4]"
      }`}
      data-testid={`package-${pkg.id}`}
    >
      {featured && tag && (
        <span className="absolute -top-3 left-8 bg-[#722F37] text-white text-[10px] uppercase tracking-wider px-3 py-1 rounded-sm">
          {tag}
        </span>
      )}
      <p className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">{pkg.name}</p>
      <div className="flex items-end gap-2 mt-4">
        <span className="font-serif text-5xl text-[#1C1917]">{pkg.credits}</span>
        <span className="text-[#57534E] mb-2">crediti</span>
      </div>
      <p className="font-serif text-2xl text-[#1C1917] mt-4">€{pkg.amount.toFixed(2)}</p>
      <p className="text-sm text-[#57534E] mt-1">~{Math.floor(pkg.credits / 8)} libri completi</p>
      <ul className="space-y-2 mt-6 mb-8 text-sm text-[#57534E] flex-1">
        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#722F37]" strokeWidth={2} /> Generazione testo illimitata</li>
        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#722F37]" strokeWidth={2} /> Copertine e ritratti AI</li>
        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#722F37]" strokeWidth={2} /> Export PDF e condivisione</li>
      </ul>
      <button
        onClick={onBuy}
        disabled={loading}
        data-testid={`buy-${pkg.id}-btn`}
        className={`flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-medium transition-all duration-300 disabled:opacity-60 ${
          featured
            ? "bg-[#722F37] text-white hover:bg-[#5C252C]"
            : "border border-[#722F37] text-[#722F37] hover:bg-[#722F37] hover:text-white"
        }`}
      >
        {loading ? (
          <><Sparkles className="w-4 h-4 animate-pulse" strokeWidth={1.5} /> Avvio…</>
        ) : (
          <>Acquista</>
        )}
      </button>
    </motion.div>
  );
};
