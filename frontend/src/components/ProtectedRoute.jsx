import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Feather } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Feather className="w-8 h-8 text-[#722F37] animate-pulse" strokeWidth={1.5} />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}
