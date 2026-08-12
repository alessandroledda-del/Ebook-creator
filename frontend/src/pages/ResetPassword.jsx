import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Feather, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";

const inputCls =
  "w-full bg-white border border-[#E7E5E4] rounded-sm px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#722F37] transition-colors duration-300";
const labelCls = "block text-xs font-sans uppercase tracking-[0.15em] text-[#57534E] font-semibold mb-2";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password aggiornata. Ora puoi accedere.");
      navigate("/login");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <Feather className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
          <span className="font-serif text-2xl tracking-tight">Libroteca</span>
        </Link>
        <h1 className="font-serif text-3xl tracking-tight mb-2">Reimposta la password</h1>
        <p className="text-sm text-[#57534E] mb-8">Scegli una nuova password per il tuo account.</p>
        {!token ? (
          <p data-testid="reset-invalid-token" className="text-sm text-[#B3261E]">
            Link non valido: manca il token di reset.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className={labelCls}>Nuova password</label>
              <input
                type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri" data-testid="reset-password-input" className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Conferma password</label>
              <input
                type="password" required minLength={6} value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ripeti la password" data-testid="reset-confirm-input" className={inputCls}
              />
            </div>
            {error && <p data-testid="reset-error" className="text-sm text-[#B3261E]">{error}</p>}
            <button
              type="submit" disabled={loading} data-testid="reset-submit-btn"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3.5 text-sm font-medium transition-colors duration-300 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aggiorna password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
