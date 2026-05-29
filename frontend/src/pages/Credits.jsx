import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Coins, Check, Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PACKAGE_TAG = {
  starter: "Per iniziare",
  plus: "Più popolare",
  pro: "Miglior valore",
};

export default function Credits() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [buying, setBuying] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    api.get("/payments/packages").then((r) => setPackages(r.data)).catch(() => {});
  }, []);

  const pollStatus = useCallback(
    async (sessionId, attempts = 0) => {
      const MAX = 6;
      if (attempts >= MAX) {
        setVerifying(false);
        toast.error("Verifica del pagamento scaduta. Ricarica la pagina.");
        return;
      }
      try {
        const res = await api.get(`/payments/status/${sessionId}`);
        if (res.data.payment_status === "paid") {
          await refreshUser();
          setVerifying(false);
          toast.success(`Pagamento riuscito! +${res.data.package_credits} crediti aggiunti.`);
          setParams({}, { replace: true });
          return;
        }
        if (res.data.status === "expired") {
          setVerifying(false);
          toast.error("Sessione di pagamento scaduta.");
          setParams({}, { replace: true });
          return;
        }
        setTimeout(() => pollStatus(sessionId, attempts + 1), 2000);
      } catch {
        setVerifying(false);
        toast.error("Errore nella verifica del pagamento.");
      }
    },
    [refreshUser, setParams]
  );

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (sessionId) {
      setVerifying(true);
      pollStatus(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buy = async (packageId) => {
    setBuying(packageId);
    try {
      const res = await api.post("/payments/checkout", {
        package_id: packageId,
        origin_url: window.location.origin,
      });
      window.location.href = res.data.url;
    } catch {
      toast.error("Impossibile avviare il pagamento");
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />

      {verifying && (
        <div className="fixed inset-0 z-[60] bg-[#FDFBF7]/95 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#722F37] animate-spin mb-4" strokeWidth={1.5} />
          <p className="font-serif text-2xl text-[#1C1917]">Verifica del pagamento…</p>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-12">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-[#57534E] hover:text-[#722F37] transition-colors mb-8"
          data-testid="credits-back-btn"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Indietro
        </button>

        <div className="text-center mb-4">
          <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-3">
            Crediti
          </p>
          <h1 className="font-serif text-4xl lg:text-5xl tracking-tight text-[#1C1917]">
            Continua a <span className="italic text-[#722F37]">scrivere</span>
          </h1>
          <div className="inline-flex items-center gap-2 mt-6 bg-white border border-[#E7E5E4] rounded-sm px-5 py-2.5">
            <Coins className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
            <span className="text-lg font-medium" data-testid="current-credits">{user?.credits ?? 0}</span>
            <span className="text-sm text-[#57534E]">crediti disponibili</span>
          </div>
        </div>

        <p className="text-center text-sm text-[#57534E] max-w-xl mx-auto mt-6 mb-12">
          Testo (capitolo, struttura, riscrittura) = 1 credito · Immagini (copertina, ritratto) = 2 crediti.
        </p>

        <div className="grid md:grid-cols-3 gap-8" data-testid="packages-grid">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`relative bg-white border rounded-sm p-8 flex flex-col ${
                pkg.id === "plus" ? "border-[#722F37] shadow-md" : "border-[#E7E5E4]"
              }`}
              data-testid={`package-${pkg.id}`}
            >
              {pkg.id === "plus" && (
                <span className="absolute -top-3 left-8 bg-[#722F37] text-white text-[10px] uppercase tracking-wider px-3 py-1 rounded-sm">
                  {PACKAGE_TAG[pkg.id]}
                </span>
              )}
              <p className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">{pkg.name}</p>
              <div className="flex items-end gap-2 mt-4">
                <span className="font-serif text-5xl text-[#1C1917]">{pkg.credits}</span>
                <span className="text-[#57534E] mb-2">crediti</span>
              </div>
              <p className="font-serif text-2xl text-[#1C1917] mt-4">€{pkg.amount.toFixed(2)}</p>
              <p className="text-sm text-[#57534E] mt-1">
                ~{Math.floor(pkg.credits / 8)} libri completi
              </p>
              <ul className="space-y-2 mt-6 mb-8 text-sm text-[#57534E] flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#722F37]" strokeWidth={2} /> Generazione testo illimitata</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#722F37]" strokeWidth={2} /> Copertine e ritratti AI</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#722F37]" strokeWidth={2} /> Export PDF e condivisione</li>
              </ul>
              <button
                onClick={() => buy(pkg.id)}
                disabled={buying === pkg.id}
                data-testid={`buy-${pkg.id}-btn`}
                className={`flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-medium transition-all duration-300 disabled:opacity-60 ${
                  pkg.id === "plus"
                    ? "bg-[#722F37] text-white hover:bg-[#5C252C]"
                    : "border border-[#722F37] text-[#722F37] hover:bg-[#722F37] hover:text-white"
                }`}
              >
                {buying === pkg.id ? (
                  <><Sparkles className="w-4 h-4 animate-pulse" strokeWidth={1.5} /> Avvio…</>
                ) : (
                  <>Acquista</>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
