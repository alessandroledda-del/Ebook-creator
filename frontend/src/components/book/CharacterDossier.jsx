import { UserPlus, Trash2, Pencil, ImagePlus, Sparkles, Shield, Zap, HeartCrack } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHAR_PLACEHOLDER } from "@/components/book/media";

const Trait = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="bg-white p-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#722F37] font-semibold mb-1">
        <Icon className="w-3 h-3" strokeWidth={2} /> {label}
      </p>
      <p className="text-sm text-[#292524]">{value}</p>
    </div>
  ) : null;

export const CharacterDossier = ({
  characters,
  portraitModel,
  setPortraitModel,
  portraitLoading,
  onAdd,
  onEdit,
  onDelete,
  onPortrait,
}) => (
  <>
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h2 className="font-serif text-2xl text-[#1C1917]">Dossier dei personaggi</h2>
      <div className="flex items-center gap-3">
        <Select value={portraitModel} onValueChange={setPortraitModel}>
          <SelectTrigger data-testid="portrait-model-select" className="w-44 rounded-sm border-[#E7E5E4] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini-nano-banana">Ritratti: Nano Banana</SelectItem>
            <SelectItem value="gpt-image-1">Ritratti: GPT Image 1</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={onAdd}
          data-testid="add-character-btn"
          className="flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-4 py-2 text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" strokeWidth={1.5} /> Aggiungi
        </button>
      </div>
    </div>

    {characters.length === 0 ? (
      <p className="text-[#57534E]">Nessun personaggio. Aggiungine uno.</p>
    ) : (
      <div className="grid md:grid-cols-2 gap-6" data-testid="characters-grid">
        {characters.map((c) => (
          <div key={c.id} className="bg-white border border-[#E7E5E4] rounded-sm p-6" data-testid="character-card">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <img
                  src={c.immagine || CHAR_PLACEHOLDER}
                  alt={c.nome}
                  className="w-16 h-16 rounded-sm object-cover bg-[#F5F3EC]"
                  data-testid="character-portrait"
                />
                <button
                  onClick={() => onPortrait(c.id)}
                  disabled={portraitLoading === c.id}
                  data-testid="generate-portrait-btn"
                  title={c.immagine ? "Rigenera ritratto" : "Genera ritratto"}
                  className="absolute -bottom-2 -right-2 w-7 h-7 flex items-center justify-center bg-[#722F37] text-white rounded-full hover:bg-[#5C252C] transition-colors disabled:opacity-60"
                >
                  {portraitLoading === c.id ? (
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" strokeWidth={1.5} />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-2xl text-[#1C1917] leading-tight">{c.nome}</h3>
                {c.ruolo && <p className="text-xs uppercase tracking-wider text-[#722F37] font-semibold mt-1">{c.ruolo}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onEdit(c)} className="text-[#57534E] hover:text-[#722F37]" data-testid="edit-character-btn">
                  <Pencil className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => onDelete(c.id)} className="text-[#57534E] hover:text-[#722F37]" data-testid="delete-character-btn">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
            {c.descrizione && <p className="text-sm text-[#57534E] leading-relaxed mt-4">{c.descrizione}</p>}
            <div className="grid grid-cols-1 gap-px bg-[#E7E5E4] border border-[#E7E5E4] rounded-sm mt-4 overflow-hidden">
              <Trait icon={Zap} label="Abilità" value={c.abilita} />
              <Trait icon={Shield} label="Punti di forza" value={c.punti_forza} />
              <Trait icon={HeartCrack} label="Punti di debolezza" value={c.punti_debolezza} />
            </div>
          </div>
        ))}
      </div>
    )}
  </>
);
