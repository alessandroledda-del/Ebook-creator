import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Feather, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputCls =
  "w-full bg-white border border-[#E7E5E4] rounded-sm px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#722F37] transition-colors duration-300";
const labelCls = "block text-xs font-sans uppercase tracking-[0.15em] text-[#57534E] font-semibold mb-2";

function GoogleButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="google-login-btn"
      className="w-full inline-flex items-center justify-center gap-3 border border-[#E7E5E4] bg-white hover:bg-[#FAF8F3] rounded-sm px-5 py-3 text-sm font-medium text-[#1C1917] transition-colors duration-300"
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
      </svg>
      Continua con Google
    </button>
  );
}

export default function Login() {
  const { user, loading: authLoading, setUser, login: googleLogin } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("login"); // login | register | forgot
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard");
  }, [user, authLoading, navigate]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const switchView = (v) => {
    setView(v);
    setError("");
    setForgotSent(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (view === "login") {
        const { data } = await api.post("/auth/login", { email: form.email, password: form.password });
        setUser(data);
        navigate("/dashboard");
      } else if (view === "register") {
        const { data } = await api.post("/auth/register", {
          name: form.name, email: form.email, password: form.password,
        });
        setUser(data);
        toast.success("Benvenuto! Hai ricevuto 15 crediti omaggio.");
        navigate("/dashboard");
      } else {
        await api.post("/auth/forgot-password", { email: form.email });
        setForgotSent(true);
      }
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917] grid lg:grid-cols-[0.9fr_1.1fr]">
      {/* Left panel */}
      <div className="hidden lg:flex relative bg-[#722F37] text-white flex-col justify-between p-12 overflow-hidden">
        <div className="grain-overlay opacity-[0.06]" />
        <Link to="/" className="relative flex items-center gap-2" data-testid="login-brand-link">
          <Feather className="w-5 h-5 text-white/90" strokeWidth={1.5} />
          <span className="font-serif text-2xl tracking-tight">Libroteca</span>
        </Link>
        <div className="relative">
          <p className="font-serif text-4xl leading-tight max-w-md">
            &ldquo;Ogni grande libro comincia da una piccola idea.&rdquo;
          </p>
          <p className="text-white/70 mt-6 text-sm">
            Accedi e trasforma le tue idee in libri completi, con trame, personaggi e copertine generati dall&apos;AI.
          </p>
        </div>
        <span className="relative text-white/50 text-xs">La tua casa editrice personale.</span>
      </div>

      {/* Right panel: form */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-10" data-testid="login-brand-link-mobile">
            <Feather className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
            <span className="font-serif text-2xl tracking-tight">Libroteca</span>
          </Link>

          {view === "forgot" ? (
            <>
              <button
                onClick={() => switchView("login")}
                data-testid="back-to-login-btn"
                className="inline-flex items-center gap-1.5 text-sm text-[#57534E] hover:text-[#722F37] transition-colors mb-6"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Torna all&apos;accesso
              </button>
              <h1 className="font-serif text-3xl tracking-tight mb-2">Password dimenticata</h1>
              <p className="text-sm text-[#57534E] mb-8">
                Inserisci la tua email: genereremo un link per reimpostare la password.
              </p>
              {forgotSent ? (
                <div
                  data-testid="forgot-success-message"
                  className="border border-[#E7E5E4] bg-white rounded-sm p-5 text-sm text-[#1C1917]"
                >
                  Se l&apos;email è registrata, è stato generato un link di reset. Contatta il supporto
                  se non riesci a recuperarlo.
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <label className={labelCls}>Email</label>
                    <input
                      type="email" required value={form.email} onChange={set("email")}
                      placeholder="nome@esempio.it" data-testid="forgot-email-input" className={inputCls}
                    />
                  </div>
                  {error && <p data-testid="auth-error" className="text-sm text-[#B3261E]">{error}</p>}
                  <button
                    type="submit" disabled={loading} data-testid="forgot-submit-btn"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3.5 text-sm font-medium transition-colors duration-300 disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invia link di reset"}
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <h1 className="font-serif text-3xl tracking-tight mb-2">
                {view === "login" ? "Bentornato" : "Crea il tuo account"}
              </h1>
              <p className="text-sm text-[#57534E] mb-8">
                {view === "login"
                  ? "Accedi per continuare a scrivere i tuoi libri."
                  : "Registrati e ricevi 15 crediti omaggio per il tuo primo libro."}
              </p>

              {/* Tabs */}
              <div className="flex border-b border-[#E7E5E4] mb-8">
                {[
                  { id: "login", label: "Accedi" },
                  { id: "register", label: "Registrati" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => switchView(t.id)}
                    data-testid={`tab-${t.id}`}
                    className={`px-5 py-3 text-sm font-medium -mb-px border-b-2 transition-colors duration-300 ${
                      view === t.id
                        ? "border-[#722F37] text-[#722F37]"
                        : "border-transparent text-[#57534E] hover:text-[#1C1917]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-5">
                {view === "register" && (
                  <div>
                    <label className={labelCls}>Nome</label>
                    <input
                      type="text" required value={form.name} onChange={set("name")}
                      placeholder="Il tuo nome" data-testid="register-name-input" className={inputCls}
                    />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email" required value={form.email} onChange={set("email")}
                    placeholder="nome@esempio.it"
                    data-testid={view === "login" ? "login-email-input" : "register-email-input"}
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`${labelCls} mb-0`}>Password</label>
                    {view === "login" && (
                      <button
                        type="button" onClick={() => switchView("forgot")}
                        data-testid="forgot-password-link"
                        className="text-xs text-[#722F37] hover:underline"
                      >
                        Password dimenticata?
                      </button>
                    )}
                  </div>
                  <input
                    type="password" required minLength={6} value={form.password} onChange={set("password")}
                    placeholder={view === "register" ? "Minimo 6 caratteri" : "••••••••"}
                    data-testid={view === "login" ? "login-password-input" : "register-password-input"}
                    className={inputCls}
                  />
                </div>

                {error && <p data-testid="auth-error" className="text-sm text-[#B3261E]">{error}</p>}

                <button
                  type="submit" disabled={loading}
                  data-testid={view === "login" ? "login-submit-btn" : "register-submit-btn"}
                  className="group w-full inline-flex items-center justify-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3.5 text-sm font-medium transition-colors duration-300 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {view === "login" ? "Accedi" : "Crea account"}
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center gap-4 my-7">
                <div className="flex-1 h-px bg-[#E7E5E4]" />
                <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E]">oppure</span>
                <div className="flex-1 h-px bg-[#E7E5E4]" />
              </div>

              <GoogleButton onClick={googleLogin} />
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
