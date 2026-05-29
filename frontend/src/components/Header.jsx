import { Link, useNavigate } from "react-router-dom";
import { Feather, LogOut, LibraryBig, PenLine } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-xl border-b border-[#E7E5E4]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 group" data-testid="header-logo">
          <Feather className="w-5 h-5 text-[#722F37]" strokeWidth={1.5} />
          <span className="font-serif text-2xl tracking-tight text-[#1C1917]">Libroteca</span>
        </Link>

        <nav className="flex items-center gap-3">
          <button
            onClick={() => navigate("/crea")}
            data-testid="header-new-book-btn"
            className="hidden sm:flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-4 py-2 text-sm font-medium transition-colors duration-300"
          >
            <PenLine className="w-4 h-4" strokeWidth={1.5} /> Nuovo libro
          </button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="outline-none">
                  <Avatar className="w-9 h-9 border border-[#E7E5E4]">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback className="bg-[#722F37] text-white text-sm">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-sans">
                  <p className="text-sm text-[#1C1917]">{user.name}</p>
                  <p className="text-xs text-[#57534E] font-normal truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="menu-library">
                  <LibraryBig className="w-4 h-4 mr-2" strokeWidth={1.5} /> La mia libreria
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} data-testid="logout-btn" className="text-[#722F37]">
                  <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} /> Esci
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
}
