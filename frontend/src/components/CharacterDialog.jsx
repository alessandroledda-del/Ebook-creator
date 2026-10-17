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
  eta: "",
  descrizione: "",
  personalita: "",
  obiettivo: "",
  paura: "",
  passato: "",
  abilita: "",
  punti_forza: "",
  punti_debolezza: "",
  relazioni: "",
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
      <DialogContent className="bg-[#FDFBF7] border-[#E7E5E4] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-[#1C1917]">
            {initial ? "Modifica personaggio" : "Nuovo personaggio"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-5 py-2 max-h-[68vh] overflow-y-auto reader-scroll pr-1">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Nome</Label>
            <Input data-testid="char-nome-input" value={form.nome} onChange={update("nome")} className={field} placeholder="Es. Elena Vasari" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Ruolo</Label>
            <Input data-testid="char-ruolo-input" value={form.ruolo} onChange={update("ruolo")} className={field} placeholder="Protagonista, antagonista..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Età</Label>
            <Input data-testid="char-eta-input" value={form.eta} onChange={update("eta")} className={field} placeholder="Es. 27 anni" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Personalità</Label>
            <Input data-testid="char-personalita-input" value={form.personalita} onChange={update("personalita")} className={field} placeholder="Ambiziosa, leale, diffidente..." />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Aspetto e caratteristiche</Label>
            <Textarea data-testid="char-descrizione-input" value={form.descrizione} onChange={update("descrizione")} className={field} placeholder="Aspetto fisico, abiti, segni distintivi, presenza scenica..." rows={2} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Obiettivo</Label>
            <Textarea data-testid="char-obiettivo-input" value={form.obiettivo} onChange={update("obiettivo")} className={field} placeholder="Cosa vuole ottenere davvero" rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Paura / ferita</Label>
            <Textarea data-testid="char-paura-input" value={form.paura} onChange={update("paura")} className={field} placeholder="Cosa teme o cosa non riesce ad affrontare" rows={2} />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Passato</Label>
            <Textarea data-testid="char-passato-input" value={form.passato} onChange={update("passato")} className={field} placeholder="Eventi del passato che influenzano le sue scelte" rows={3} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Abilità / poteri</Label>
            <Textarea data-testid="char-abilita-input" value={form.abilita} onChange={update("abilita")} className={field} placeholder="Competenze, magia, talenti..." rows={2} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Relazioni</Label>
            <Textarea data-testid="char-relazioni-input" value={form.relazioni} onChange={update("relazioni")} className={field} placeholder="Legami, rivalità, debiti, alleanze..." rows={2} />
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
