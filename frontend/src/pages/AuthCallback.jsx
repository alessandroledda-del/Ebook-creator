import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Feather } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const match = window.location.hash.match(/session_id=([^&]+)/);
    const sessionId = match ? match[1] : null;
    if (!sessionId) {
      navigate("/");
      return;
    }
    (async () => {
      try {
        const res = await api.post("/auth/session", { session_id: sessionId });
        setUser(res.data);
        window.history.replaceState(null, "", "/dashboard");
        navigate("/dashboard", { state: { user: res.data } });
      } catch (e) {
        setError(true);
        setTimeout(() => navigate("/"), 1800);
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
      <Feather className="w-10 h-10 text-[#722F37] animate-pulse mb-4" strokeWidth={1.5} />
      <p className="font-serif text-2xl text-[#1C1917]" data-testid="auth-callback-status">
        {error ? "Accesso non riuscito, reindirizzamento..." : "Stiamo preparando il tuo studio..."}
      </p>
    </div>
  );
}
