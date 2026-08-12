import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Feather } from "lucide-react";
import Header from "@/components/Header";
import CharacterDialog from "@/components/CharacterDialog";
import { BookMeta } from "@/components/book/BookMeta";
import { ChapterReader } from "@/components/book/ChapterReader";
import { CharacterDossier } from "@/components/book/CharacterDossier";
import { CoverStudio } from "@/components/book/CoverStudio";
import { ShareDialog } from "@/components/book/ShareDialog";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function BookView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);

  // character dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editChar, setEditChar] = useState(null);

  // cover
  const [coverModel, setCoverModel] = useState("gemini-nano-banana");
  const [coverStyle, setCoverStyle] = useState("elegante e cinematografico");
  const [coverLoading, setCoverLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingEpub, setDownloadingEpub] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceName, setReferenceName] = useState("");

  // sharing
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // chapter regeneration
  const [regenerating, setRegenerating] = useState(false);
  const [customInstr, setCustomInstr] = useState("");

  // portrait
  const [portraitModel, setPortraitModel] = useState("gemini-nano-banana");
  const [portraitLoading, setPortraitLoading] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/books/${id}`);
      setBook(res.data);
    } catch {
      toast.error("Libro non trovato");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const saveCharacter = async (char) => {
    try {
      if (editChar) {
        await api.put(`/books/${id}/characters/${editChar.id}`, char);
      } else {
        await api.post(`/books/${id}/characters`, char);
      }
      toast.success("Personaggio salvato");
      setEditChar(null);
      load();
    } catch {
      toast.error("Salvataggio non riuscito");
    }
  };

  const deleteCharacter = async (charId) => {
    try {
      await api.delete(`/books/${id}/characters/${charId}`);
      load();
    } catch {
      toast.error("Eliminazione non riuscita");
    }
  };

  const regenerateChapter = async (instruction) => {
    setRegenerating(true);
    try {
      const res = await api.post(`/books/${id}/regenerate-chapter`, {
        index: activeChapter,
        instruction,
      });
      setBook((b) => {
        const caps = [...(b.capitoli || [])];
        caps[activeChapter] = { ...caps[activeChapter], contenuto: res.data.contenuto };
        return { ...b, capitoli: caps };
      });
      setCustomInstr("");
      await refreshUser();
      toast.success("Capitolo rigenerato");
    } catch (e) {
      if (e?.response?.status === 402) {
        toast.error("Crediti insufficienti per rigenerare.");
        navigate("/crediti");
      } else {
        toast.error("Rigenerazione non riuscita");
      }
    } finally {
      setRegenerating(false);
    }
  };

  const generatePortrait = async (charId) => {
    setPortraitLoading(charId);
    try {
      const res = await api.post(`/books/${id}/characters/${charId}/portrait`, {
        model: portraitModel,
      });
      setBook((b) => ({
        ...b,
        characters: (b.characters || []).map((c) =>
          c.id === charId ? { ...c, immagine: res.data.immagine } : c
        ),
      }));
      await refreshUser();
      toast.success("Ritratto generato");
    } catch (e) {
      if (e?.response?.status === 402) {
        toast.error("Crediti insufficienti per il ritratto.");
        navigate("/crediti");
      } else {
        toast.error("Generazione ritratto fallita");
      }
    } finally {
      setPortraitLoading(null);
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/books/${id}/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(book.titolo || "libro").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Download non riuscito");
    } finally {
      setDownloading(false);
    }
  };

  const downloadEpub = async () => {
    setDownloadingEpub(true);
    try {
      const res = await api.get(`/books/${id}/export/epub`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/epub+zip" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(book.titolo || "libro").replace(/\s+/g, "_")}.epub`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Download EPUB non riuscito");
    } finally {
      setDownloadingEpub(false);
    }
  };

  const generateCover = async () => {
    setCoverLoading(true);
    try {
      const res = await api.post(`/books/${id}/cover`, {
        model: coverModel,
        style: coverStyle,
        reference_image: referenceImage,
      });
      setBook((b) => ({ ...b, cover_image: res.data.cover_image, cover_model: res.data.cover_model }));
      await refreshUser();
      toast.success("Copertina generata!");
    } catch (e) {
      if (e?.response?.status === 402) {
        toast.error("Crediti insufficienti per la copertina.");
        navigate("/crediti");
      } else {
        toast.error("Generazione copertina fallita");
      }
    } finally {
      setCoverLoading(false);
    }
  };

  const onReferenceSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Immagine troppo grande (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result);
      setReferenceName(file.name);
      if (coverModel === "gpt-image-1") setCoverModel("gemini-nano-banana");
    };
    reader.readAsDataURL(file);
  };

  const removeReference = () => {
    setReferenceImage(null);
    setReferenceName("");
  };

  const toggleShare = async (makePublic) => {
    setSharing(true);
    try {
      const res = await api.post(`/books/${id}/share`, { public: makePublic });
      setBook((b) => ({ ...b, is_public: res.data.is_public, public_id: res.data.public_id }));
      toast.success(makePublic ? "Libro reso pubblico" : "Condivisione disattivata");
    } catch {
      toast.error("Operazione non riuscita");
    } finally {
      setSharing(false);
    }
  };

  const shareUrl = book?.public_id ? `${window.location.origin}/api/share/${book.public_id}` : "";

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copia non riuscita");
    }
  };

  const activeParagraphs = useMemo(() => {
    const text = book?.capitoli?.[activeChapter]?.contenuto || "";
    return text.split(/\n+/).filter(Boolean);
  }, [book, activeChapter]);

  if (loading || !book) {
    return (
      <div className="min-h-screen bg-[#FDFBF7]">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Feather className="w-8 h-8 text-[#722F37] animate-pulse" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  const chapters = book.capitoli || [];
  const characters = book.characters || [];

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-[#57534E] hover:text-[#722F37] transition-colors mb-8"
          data-testid="back-to-library-btn"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Libreria
        </button>

        <BookMeta
          book={book}
          downloading={downloading}
          downloadingEpub={downloadingEpub}
          onDownload={downloadPdf}
          onDownloadEpub={downloadEpub}
          onShare={() => setShareOpen(true)}
          onSequel={() => navigate(`/crea?sequel=${book.id}`)}
        />

        <Tabs defaultValue="lettura">
          <TabsList className="bg-[#F5F3EC] rounded-sm">
            <TabsTrigger value="lettura" data-testid="tab-lettura">Lettura</TabsTrigger>
            <TabsTrigger value="personaggi" data-testid="tab-personaggi">
              Personaggi ({characters.length})
            </TabsTrigger>
            <TabsTrigger value="copertina" data-testid="tab-copertina">Copertina</TabsTrigger>
          </TabsList>

          <TabsContent value="lettura" className="mt-8">
            <ChapterReader
              chapters={chapters}
              activeChapter={activeChapter}
              setActiveChapter={setActiveChapter}
              paragraphs={activeParagraphs}
              riassunto={book.riassunto}
              regenerating={regenerating}
              customInstr={customInstr}
              setCustomInstr={setCustomInstr}
              onRegenerate={regenerateChapter}
            />
          </TabsContent>

          <TabsContent value="personaggi" className="mt-8">
            <CharacterDossier
              characters={characters}
              portraitModel={portraitModel}
              setPortraitModel={setPortraitModel}
              portraitLoading={portraitLoading}
              onAdd={() => {
                setEditChar(null);
                setDialogOpen(true);
              }}
              onEdit={(c) => {
                setEditChar(c);
                setDialogOpen(true);
              }}
              onDelete={deleteCharacter}
              onPortrait={generatePortrait}
            />
          </TabsContent>

          <TabsContent value="copertina" className="mt-8">
            <CoverStudio
              coverImage={book.cover_image}
              coverModel={coverModel}
              setCoverModel={setCoverModel}
              coverStyle={coverStyle}
              setCoverStyle={setCoverStyle}
              referenceImage={referenceImage}
              referenceName={referenceName}
              onReferenceSelect={onReferenceSelect}
              onRemoveReference={removeReference}
              coverLoading={coverLoading}
              onGenerate={generateCover}
            />
          </TabsContent>
        </Tabs>
      </main>

      <CharacterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={saveCharacter}
        initial={editChar}
      />

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        isPublic={book.is_public}
        shareUrl={shareUrl}
        copied={copied}
        sharing={sharing}
        onToggle={toggleShare}
        onCopy={copyShareUrl}
      />
    </div>
  );
}
