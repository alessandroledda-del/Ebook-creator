import { ImagePlus, Sparkles, Upload, X, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOOK_MOCKUP } from "@/components/book/media";

export const CoverStudio = ({
  coverImage,
  coverModel,
  setCoverModel,
  coverStyle,
  setCoverStyle,
  referenceImage,
  referenceName,
  onReferenceSelect,
  onRemoveReference,
  coverLoading,
  onGenerate,
  isSequel,
  parentTitle,
  useParentCover,
  setUseParentCover,
}) => (
  <div className="grid md:grid-cols-2 gap-10 items-start">
    <div className="flex justify-center">
      <img
        src={coverImage || BOOK_MOCKUP}
        alt="Copertina"
        className="w-64 h-[22rem] object-cover rounded-sm shadow-xl"
        data-testid="cover-preview"
      />
    </div>
    <div>
      <h2 className="font-serif text-2xl text-[#1C1917] mb-2">Genera la copertina</h2>
      <p className="text-sm text-[#57534E] mb-8">
        Scegli il motore di generazione e lo stile visivo. La copertina viene creata dalla trama del libro.
      </p>
      <div className="space-y-8">
        {isSequel && (
          <button
            type="button"
            onClick={() => setUseParentCover(!useParentCover)}
            data-testid="series-cover-toggle"
            className={`w-full flex items-start gap-3 border rounded-sm p-4 text-left transition-colors duration-300 ${
              useParentCover
                ? "border-[#722F37] bg-[#722F37]/5"
                : "border-[#E7E5E4] hover:border-[#722F37]"
            }`}
          >
            <Layers className={`w-5 h-5 shrink-0 mt-0.5 ${useParentCover ? "text-[#722F37]" : "text-[#57534E]"}`} strokeWidth={1.5} />
            <span>
              <span className="block text-sm font-medium text-[#1C1917]">
                Copertina coordinata con la serie
              </span>
              <span className="block text-xs text-[#57534E] mt-1">
                Usa la copertina di «{parentTitle}» come riferimento di stile: stessa palette e identità visiva. (Nano Banana)
              </span>
            </span>
            <span
              className={`ml-auto shrink-0 w-9 h-5 rounded-full relative transition-colors duration-300 ${
                useParentCover ? "bg-[#722F37]" : "bg-[#E7E5E4]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                  useParentCover ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
          </button>
        )}
        <div>
          <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Motore</Label>
          <Select value={coverModel} onValueChange={setCoverModel}>
            <SelectTrigger data-testid="cover-model-select" className="mt-2 rounded-sm border-[#E7E5E4]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemini-nano-banana">Gemini Nano Banana</SelectItem>
              <SelectItem value="gpt-image-1">GPT Image 1</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">Stile visivo</Label>
          <Input
            data-testid="cover-style-input"
            value={coverStyle}
            onChange={(e) => setCoverStyle(e.target.value)}
            className="bg-transparent border-0 border-b-2 border-[#E7E5E4] rounded-none focus-visible:ring-0 focus:border-[#722F37] px-0 mt-2"
          />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-[0.2em] text-[#722F37] font-semibold">
            Immagine di riferimento (opzionale)
          </Label>
          <p className="text-xs text-[#57534E] mt-1 mb-3">
            Guida la composizione caricando un&apos;immagine. Disponibile con Nano Banana.
          </p>
          {referenceImage ? (
            <div className="flex items-center gap-3">
              <img src={referenceImage} alt="riferimento" className="w-16 h-16 object-cover rounded-sm border border-[#E7E5E4]" data-testid="reference-preview" />
              <span className="text-sm text-[#57534E] truncate max-w-[160px]">{referenceName}</span>
              <button onClick={onRemoveReference} data-testid="remove-reference-btn" className="text-[#57534E] hover:text-[#722F37]">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <label
              data-testid="reference-upload-label"
              className="inline-flex items-center gap-2 border border-dashed border-[#E7E5E4] hover:border-[#722F37] rounded-sm px-4 py-2.5 text-sm text-[#57534E] cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} /> Carica immagine
              <input type="file" accept="image/*" className="hidden" onChange={onReferenceSelect} data-testid="reference-input" />
            </label>
          )}
        </div>
        <button
          onClick={onGenerate}
          disabled={coverLoading}
          data-testid="generate-cover-btn"
          className="flex items-center gap-2 bg-[#722F37] text-white hover:bg-[#5C252C] rounded-sm px-6 py-3 font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
        >
          {coverLoading ? (
            <><Sparkles className="w-5 h-5 animate-pulse" strokeWidth={1.5} /> Generazione…</>
          ) : (
            <><ImagePlus className="w-5 h-5" strokeWidth={1.5} /> Genera copertina</>
          )}
        </button>
      </div>
    </div>
  </div>
);
