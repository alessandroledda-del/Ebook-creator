import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const EMPTY = {
  nome: "",
  ruolo: "",
  descrizione: "",
  abilita: "",
  punti_forza: "",
  punti_debolezza: "",
};

export default function CharacterDialog({ open, onOpenChange, onSave, initial }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    if (!form.nome.trim()) return;
    onSave(form);
    onOpenChange(false);
  };

  const field = "bg-transparent border-0 border-b-2 border-[#E7E5E4] rounded-none focus-visible:ring-0 focus:border-[#722F37] px-0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#FDFBF7] border-[#E7E5E4] max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-[#1C1917]">
            {initial ? "Modifica personaggio" : "Nuovo personaggio"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto reader-scroll pr-1">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Nome</Label>
            <Input data-testid="char-nome-input" value={form.nome} onChange={update("nome")} className={field} placeholder="Es. Elena Vasari" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Ruolo</Label>
            <Input data-testid="char-ruolo-input" value={form.ruolo} onChange={update("ruolo")} className={field} placeholder="Protagonista, antagonista..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Caratteristiche</Label>
            <Textarea data-testid="char-descrizione-input" value={form.descrizione} onChange={update("descrizione")} className={field} placeholder="Aspetto e personalità" rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Abilità</Label>
            <Textarea data-testid="char-abilita-input" value={form.abilita} onChange={update("abilita")} className={field} placeholder="Cosa sa fare" rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Punti di forza</Label>
            <Textarea data-testid="char-forza-input" value={form.punti_forza} onChange={update("punti_forza")} className={field} rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Punti di debolezza</Label>
            <Textarea data-testid="char-debolezza-input" value={form.punti_debolezza} onChange={update("punti_debolezza")} className={field} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-sm border-[#E7E5E4]">
            Annulla
          </Button>
          <Button data-testid="char-save-btn" onClick={handleSave} disabled={!form.nome.trim()} className="bg-[#722F37] hover:bg-[#5C252C] rounded-sm">
            Salva personaggio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
