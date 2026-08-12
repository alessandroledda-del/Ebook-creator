import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, KeyRound, Mail, UserCircle } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";

const inputCls =
  "w-full bg-white border border-[#E7E5E4] rounded-sm px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#722F37] transition-colors duration-300";
const labelCls = "block text-xs font-sans uppercase tracking-[0.15em] text-[#57534E] font-semibold mb-2";

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white border border-[#E7E5E4] rounded-sm p-8"
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 flex items-center justify-center rounded-sm bg-[#F5F3EC]">
          <Icon className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-[#57534E] mb-6 mt-2">{subtitle}</p>
      {children}
    </motion.div>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [account, setAccount] = useState(null);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [emForm, setEmForm] = useState({ email: "", password: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [emLoading, setEmLoading] = useState(false);

  useEffect(() => {
    api.get("/auth/account").then((r) => setAccount(r.data)).catch(() => {});
  }, []);

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      toast.error("Le nuove password non coincidono.");
      return;
    }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", {
        current_password: pwForm.current,
        new_password: pwForm.next,
      });
      toast.success(account?.has_password ? "Password aggiornata con successo." : "Password impostata! Ora puoi accedere anche con email e password.");
      setPwForm({ current: "", next: "", confirm: "" });
      setAccount((a) => ({ ...a, has_password: true }));
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const changeEmail = async (e) => {
    e.preventDefault();
    setEmLoading(true);
    try {
      const { data } = await api.post("/auth/change-email", {
        new_email: emForm.email,
        password: emForm.password,
      });
      toast.success("Email aggiornata con successo.");
      setEmForm({ email: "", password: "" });
      setAccount((a) => ({ ...a, email: data.email }));
      refreshUser();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setEmLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1C1917]">
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-12">
          <p className="text-xs font-sans uppercase tracking-[0.2em] text-[#722F37] font-semibold mb-3">Account</p>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight">Il tuo profilo</h1>
        </div>

        <div className="space-y-8">
          {/* Info account */}
          <SectionCard
            icon={UserCircle}
            title="Informazioni"
            subtitle="I dati principali del tuo account."
          >
            <div className="grid sm:grid-cols-3 gap-6 text-sm" data-testid="account-info">
              <div>
                <p className={labelCls}>Nome</p>
                <p data-testid="account-name">{user?.name}</p>
              </div>
              <div>
                <p className={labelCls}>Email</p>
                <p data-testid="account-email" className="break-all">{account?.email || user?.email}</p>
              </div>
              <div>
                <p className={labelCls}>Accesso</p>
                <p data-testid="account-provider">
                  {account?.auth_provider === "google" ? "Google" : "Email e password"}
                  {account?.auth_provider === "google" && account?.has_password ? " + password" : ""}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Cambio password */}
          <SectionCard
            icon={KeyRound}
            title={account && !account.has_password ? "Imposta una password" : "Cambia password"}
            subtitle={
              account && !account.has_password
                ? "Il tuo account usa Google. Imposta una password per accedere anche con email e password."
                : "Scegli una nuova password per il tuo account."
            }
          >
            <form onSubmit={changePassword} className="space-y-5 max-w-md">
              {account?.has_password && (
                <div>
                  <label className={labelCls}>Password attuale</label>
                  <input
                    type="password" required value={pwForm.current}
                    onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                    placeholder="••••••••" data-testid="current-password-input" className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>Nuova password</label>
                <input
                  type="password" required minLength={6} value={pwForm.next}
                  onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                  placeholder="Minimo 6 caratteri" data-testid="new-password-input" className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Conferma nuova password</label>
                <input
                  type="password" required minLength={6} value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder="Ripeti la password" data-testid="confirm-password-input" className={inputCls}
                />
              </div>
              <button
                type="submit" disabled={pwLoading} data-testid="change-password-btn"
                className="inline-flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3 text-sm font-medium transition-colors duration-300 disabled:opacity-60"
              >
                {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aggiorna password"}
              </button>
            </form>
          </SectionCard>

          {/* Cambio email */}
          <SectionCard
            icon={Mail}
            title="Cambia email"
            subtitle={
              account && !account.has_password
                ? "Disponibile solo per account con password: impostane una qui sopra per sbloccare questa opzione."
                : "Aggiorna l'indirizzo email con cui accedi. Ti chiederemo la password per conferma."
            }
          >
            <form onSubmit={changeEmail} className="space-y-5 max-w-md">
              <div>
                <label className={labelCls}>Nuova email</label>
                <input
                  type="email" required value={emForm.email}
                  onChange={(e) => setEmForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="nuova@esempio.it" data-testid="new-email-input" className={inputCls}
                  disabled={account ? !account.has_password : false}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  type="password" required value={emForm.password}
                  onChange={(e) => setEmForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="La tua password" data-testid="email-password-input" className={inputCls}
                  disabled={account ? !account.has_password : false}
                />
              </div>
              <button
                type="submit" disabled={emLoading || (account && !account.has_password)}
                data-testid="change-email-btn"
                className="inline-flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3 text-sm font-medium transition-colors duration-300 disabled:opacity-60"
              >
                {emLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aggiorna email"}
              </button>
            </form>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
