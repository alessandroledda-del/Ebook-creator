import { Share2, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const ShareDialog = ({
  open,
  onOpenChange,
  isPublic,
  shareUrl,
  copied,
  sharing,
  onToggle,
  onCopy,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-[#FDFBF7] border-[#E7E5E4] max-w-md">
      <DialogHeader>
        <DialogTitle className="font-serif text-2xl text-[#1C1917]">Condividi il libro</DialogTitle>
      </DialogHeader>
      <div className="py-2">
        {isPublic ? (
          <>
            <p className="text-sm text-[#57534E] mb-4">
              Chiunque abbia questo link può leggere il libro (sola lettura).
            </p>
            <div className="flex items-center gap-2 mb-6">
              <Input readOnly value={shareUrl} data-testid="share-url-input" className="rounded-sm border-[#E7E5E4] text-sm" />
              <button
                onClick={onCopy}
                data-testid="copy-share-url-btn"
                className="shrink-0 flex items-center gap-1.5 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-4 py-2.5 text-sm font-medium transition-colors"
              >
                {copied ? <Check className="w-4 h-4" strokeWidth={2} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
                {copied ? "Copiato" : "Copia"}
              </button>
            </div>
            <button
              onClick={() => onToggle(false)}
              disabled={sharing}
              data-testid="unshare-btn"
              className="text-sm text-[#722F37] hover:underline disabled:opacity-60"
            >
              Disattiva condivisione pubblica
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-[#57534E] mb-6">
              Crea un link pubblico in sola lettura con copertina, capitoli e personaggi.
            </p>
            <button
              onClick={() => onToggle(true)}
              disabled={sharing}
              data-testid="make-public-btn"
              className="flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3 text-sm font-medium transition-colors disabled:opacity-60"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.5} />
              {sharing ? "Attivazione…" : "Genera link pubblico"}
            </button>
          </>
        )}
      </div>
    </DialogContent>
  </Dialog>
);
