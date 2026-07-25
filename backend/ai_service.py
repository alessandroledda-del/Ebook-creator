"""AI generation service for Libroteca AI.

Handles book text generation (Claude Sonnet 4.5 / GPT-5.2) and
book cover image generation (Gemini Nano Banana / GPT Image 1)
through the Emergent universal LLM key.
"""
import asyncio
import os
import re
import json
import base64
import logging
import uuid
from typing import Any, Dict, List, Optional, TypedDict
from dotenv import load_dotenv
from pathlib import Path

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

# Supported text models -> provider mapping
TEXT_MODELS = {
    "gpt-5.2": "openai",
    "claude-sonnet-4-5-20250929": "anthropic",
}

# Supported image models
IMAGE_MODELS = {
    "gemini-nano-banana": "gemini-3.1-flash-image-preview",
    "gpt-image-1": "gpt-image-1",
}

# Retry / timeout configuration
_LLM_TEXT_TIMEOUT: float = 120.0   # seconds for text generation
_LLM_JSON_TIMEOUT: float = 90.0    # seconds for JSON-returning calls
_LLM_IMAGE_TIMEOUT: float = 120.0  # seconds for image generation
_MAX_LLM_RETRIES: int = 2          # additional attempts (total = _MAX_LLM_RETRIES + 1)
_RETRY_BASE_DELAY: float = 2.0     # base delay in seconds (doubles each retry)


# ---------------------- TypedDicts for structured responses -----------------
class CharacterDict(TypedDict, total=False):
    id: str
    nome: str
    ruolo: str
    descrizione: str
    abilita: str
    punti_forza: str
    punti_debolezza: str


class ChapterDict(TypedDict, total=False):
    titolo: str
    sommario: str
    contenuto: str


class BookDict(TypedDict, total=False):
    titolo: str
    sottotitolo: str
    genere: str
    sinossi: str
    personaggi: List[CharacterDict]
    capitoli: List[ChapterDict]


def _provider_for(model: str) -> str:
    return TEXT_MODELS.get(model, "anthropic")


def _extract_json(raw: str) -> Dict[str, Any]:
    """Robustly extract a JSON object from an LLM response."""
    if not raw:
        raise ValueError("Risposta vuota dal modello")
    cleaned = raw.strip()
    # strip markdown fences
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _characters_block(characters: List[Dict[str, Any]]) -> str:
    if not characters:
        return "Nessun personaggio fornito: inventane tu di adatti alla storia."
    lines = []
    for c in characters:
        lines.append(
            f"- Nome: {c.get('nome', 'N/D')}; Ruolo: {c.get('ruolo', 'N/D')}; "
            f"Caratteristiche: {c.get('descrizione', '')}; "
            f"Abilità: {c.get('abilita', '')}; "
            f"Punti di forza: {c.get('punti_forza', '')}; "
            f"Punti di debolezza: {c.get('punti_debolezza', '')}"
        )
    return "\n".join(lines)


# Narrative controls ---------------------------------------------------------
LENGTH_HINTS = {
    "breve": "circa 300-450 parole",
    "media": "circa 550-750 parole",
    "lunga": "circa 900-1100 parole",
}

POV_HINTS = {
    "prima": "prima persona (narratore interno, 'io')",
    "terza": "terza persona",
}


def _length_hint(lunghezza: str) -> str:
    return LENGTH_HINTS.get((lunghezza or "media").lower(), LENGTH_HINTS["media"])


def _pov_hint(pov: str) -> str:
    return POV_HINTS.get((pov or "terza").lower(), POV_HINTS["terza"])


def _style_directives(tono: str, pov: str) -> str:
    return (
        f"Tono narrativo: {tono or 'avvincente e coinvolgente'}. "
        f"Punto di vista: {_pov_hint(pov)}."
    )


async def _chat_json(provider: str, model: str, system_message: str, prompt: str,
                     max_tokens: int = 3000, retries: int = _MAX_LLM_RETRIES,
                     timeout: float = _LLM_JSON_TIMEOUT) -> Dict[str, Any]:
    """Call the LLM and parse a JSON object.

    Retries on both transient network/timeout errors and malformed JSON output
    using exponential backoff. Raises RuntimeError after all attempts fail.
    """
    last_err: Optional[Exception] = None
    attempt_prompt = prompt
    for attempt in range(retries + 1):
        if attempt > 0:
            delay = _RETRY_BASE_DELAY * (2 ** (attempt - 1))
            logger.info(f"_chat_json retry {attempt}/{retries} in {delay:.1f}s")
            await asyncio.sleep(delay)
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"json-{uuid.uuid4().hex}",
                system_message=system_message,
            ).with_model(provider, model).with_params(max_tokens=max_tokens)
            response = await asyncio.wait_for(
                chat.send_message(UserMessage(text=attempt_prompt)),
                timeout=timeout,
            )
            try:
                return _extract_json(response)
            except (json.JSONDecodeError, ValueError) as e:
                last_err = e
                logger.warning(f"JSON parse fallito (tentativo {attempt + 1}): {e}")
                attempt_prompt = (
                    prompt
                    + "\n\nIMPORTANTE: la risposta precedente non era JSON valido. "
                    "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, nient'altro."
                )
        except asyncio.TimeoutError:
            last_err = TimeoutError(f"Timeout LLM dopo {timeout:.0f}s")
            logger.warning(f"Timeout LLM in _chat_json (tentativo {attempt + 1})")
        except Exception as e:
            last_err = e
            logger.warning(f"Errore LLM in _chat_json (tentativo {attempt + 1}): {e}")
    raise RuntimeError(
        f"Impossibile completare la richiesta LLM dopo {retries + 1} tentativi: {last_err}"
    )


async def _chat_text(provider: str, model: str, system_message: str, prompt: str,
                     max_tokens: int = 5000, retries: int = _MAX_LLM_RETRIES,
                     timeout: float = _LLM_TEXT_TIMEOUT) -> str:
    """Call the LLM and return plain text.

    Retries on transient errors using exponential backoff.
    Raises RuntimeError after all attempts fail.
    """
    last_err: Optional[Exception] = None
    for attempt in range(retries + 1):
        if attempt > 0:
            delay = _RETRY_BASE_DELAY * (2 ** (attempt - 1))
            logger.info(f"_chat_text retry {attempt}/{retries} in {delay:.1f}s")
            await asyncio.sleep(delay)
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"text-{uuid.uuid4().hex}",
                system_message=system_message,
            ).with_model(provider, model).with_params(max_tokens=max_tokens)
            response = await asyncio.wait_for(
                chat.send_message(UserMessage(text=prompt)),
                timeout=timeout,
            )
            if not response or not response.strip():
                raise ValueError("Risposta vuota dal modello")
            return response
        except asyncio.TimeoutError:
            last_err = TimeoutError(f"Timeout LLM dopo {timeout:.0f}s")
            logger.warning(f"Timeout LLM in _chat_text (tentativo {attempt + 1})")
        except Exception as e:
            last_err = e
            logger.warning(f"Errore LLM in _chat_text (tentativo {attempt + 1}): {e}")
    raise RuntimeError(
        f"Impossibile completare la richiesta LLM dopo {retries + 1} tentativi: {last_err}"
    )


async def _generate_image(prompt: str, model: str, reference_b64: Optional[str] = None,
                          retries: int = _MAX_LLM_RETRIES,
                          timeout: float = _LLM_IMAGE_TIMEOUT) -> str:
    """Generate a single image, returning a base64 data URI.

    Retries with exponential backoff on empty results or transient errors.
    """
    use_gpt = model == "gpt-image-1"
    last_err: Optional[Exception] = None
    for attempt in range(retries + 1):
        if attempt > 0:
            delay = _RETRY_BASE_DELAY * (2 ** (attempt - 1))
            logger.info(f"_generate_image retry {attempt}/{retries} in {delay:.1f}s")
            await asyncio.sleep(delay)
        try:
            if use_gpt:
                gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
                images = await asyncio.wait_for(
                    gen.generate_images(
                        prompt=prompt, model="gpt-image-1",
                        number_of_images=1, quality="high",
                    ),
                    timeout=timeout,
                )
                if images:
                    b64 = base64.b64encode(images[0]).decode("utf-8")
                    return f"data:image/png;base64,{b64}"
            else:
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=f"img-{uuid.uuid4().hex}",
                    system_message="You are a professional illustrator and cover artist.",
                ).with_model("gemini", IMAGE_MODELS["gemini-nano-banana"]).with_params(
                    modalities=["image", "text"]
                )
                if reference_b64:
                    msg = UserMessage(
                        text="Use the provided image as visual reference (composition, subject, mood). " + prompt,
                        file_contents=[ImageContent(reference_b64)],
                    )
                else:
                    msg = UserMessage(text=prompt)
                _text, images = await asyncio.wait_for(
                    chat.send_message_multimodal_response(msg),
                    timeout=timeout,
                )
                if images:
                    img = images[0]
                    return f"data:{img.get('mime_type', 'image/png')};base64,{img['data']}"
            last_err = ValueError("risposta vuota dal modello immagine")
        except asyncio.TimeoutError:
            last_err = TimeoutError(f"Timeout generazione immagine dopo {timeout:.0f}s")
            logger.warning(f"Timeout _generate_image (tentativo {attempt + 1})")
        except Exception as e:
            last_err = e
            logger.warning(f"Generazione immagine fallita (tentativo {attempt + 1}): {e}")
    raise RuntimeError(f"Nessuna immagine generata dopo {retries + 1} tentativi: {last_err}")


async def generate_book(idea: str, genere: str, model: str, num_capitoli: int,
                        characters: List[Dict[str, Any]]) -> BookDict:
    """Generate a full book (title, synopsis, chapters, enriched characters)."""
    model = model if model in TEXT_MODELS else "claude-sonnet-4-5-20250929"
    provider = _provider_for(model)
    num_capitoli = max(3, min(int(num_capitoli or 5), 10))

    system_message = (
        "Sei un pluripremiato romanziere italiano e ghostwriter professionista. "
        "Scrivi sempre in italiano, con uno stile coinvolgente, ricco e curato. "
        "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo "
        "e senza blocchi di codice markdown."
    )

    prompt = f"""Sviluppa un libro completo a partire da questa idea.

IDEA: {idea}
GENERE PREFERITO: {genere or "a tua scelta, coerente con l'idea"}
NUMERO DI CAPITOLI: {num_capitoli}

PERSONAGGI FORNITI DALL'UTENTE (da integrare e arricchire nella trama):
{_characters_block(characters)}

Restituisci un JSON con ESATTAMENTE questa struttura:
{{
  "titolo": "Titolo evocativo del libro",
  "sottotitolo": "Eventuale sottotitolo (può essere stringa vuota)",
  "genere": "Genere letterario",
  "sinossi": "Una sinossi avvincente di 4-6 frasi",
  "personaggi": [
    {{
      "nome": "Nome",
      "ruolo": "Ruolo nella storia (protagonista, antagonista, ecc.)",
      "descrizione": "Caratteristiche fisiche e di personalità",
      "abilita": "Abilità principali",
      "punti_forza": "Punti di forza",
      "punti_debolezza": "Punti di debolezza"
    }}
  ],
  "capitoli": [
    {{
      "titolo": "Titolo del capitolo",
      "contenuto": "Testo narrativo del capitolo, 350-600 parole, in prosa coinvolgente"
    }}
  ]
}}

Regole:
- Includi i personaggi forniti dall'utente, arricchendoli, e aggiungine altri se utile.
- Genera esattamente {num_capitoli} capitoli con contenuto narrativo completo.
- Mantieni coerenza di trama tra i capitoli (inizio, sviluppo, climax, finale).
- Scrivi tutto in italiano."""

    data = await _chat_json(provider, model, system_message, prompt, max_tokens=8000)

    # Normalize
    data.setdefault("titolo", "Senza titolo")
    data.setdefault("sottotitolo", "")
    data.setdefault("genere", genere or "Narrativa")
    data.setdefault("sinossi", "")
    data.setdefault("personaggi", [])
    data.setdefault("capitoli", [])
    return data


async def generate_outline(idea: str, genere: str, model: str, num_capitoli: int,
                           characters: List[Dict[str, Any]], tono: str = "", pov: str = "") -> BookDict:
    """Generate only the book skeleton: title, synopsis, characters and a
    chapter outline (titles + short summaries). Fast, enables progress UI."""
    model = model if model in TEXT_MODELS else "claude-sonnet-4-5-20250929"
    provider = _provider_for(model)
    num_capitoli = max(3, min(int(num_capitoli or 5), 10))

    system_message = (
        "Sei un pluripremiato romanziere italiano. Pianifichi libri con cura. "
        "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza markdown."
    )
    prompt = f"""Progetta la struttura di un libro a partire da questa idea.

IDEA: {idea}
GENERE PREFERITO: {genere or "a tua scelta, coerente con l'idea"}
NUMERO DI CAPITOLI: {num_capitoli}
{_style_directives(tono, pov)}

PERSONAGGI FORNITI DALL'UTENTE (da integrare e arricchire):
{_characters_block(characters)}

Restituisci un JSON con ESATTAMENTE questa struttura:
{{
  "titolo": "Titolo evocativo",
  "sottotitolo": "Sottotitolo (può essere vuoto)",
  "genere": "Genere letterario",
  "sinossi": "Sinossi avvincente di 4-6 frasi",
  "personaggi": [
    {{"nome": "", "ruolo": "", "descrizione": "", "abilita": "", "punti_forza": "", "punti_debolezza": ""}}
  ],
  "capitoli": [
    {{"titolo": "Titolo del capitolo", "sommario": "1-2 frasi su cosa accade nel capitolo"}}
  ]
}}

Regole:
- Esattamente {num_capitoli} capitoli con arco narrativo coerente (inizio, sviluppo, climax, finale).
- Integra i personaggi forniti e aggiungine altri se utile.
- Scrivi tutto in italiano. NON scrivere il contenuto completo dei capitoli, solo i sommari."""

    data = await _chat_json(provider, model, system_message, prompt, max_tokens=3000)

    data.setdefault("titolo", "Senza titolo")
    data.setdefault("sottotitolo", "")
    data.setdefault("genere", genere or "Narrativa")
    data.setdefault("sinossi", "")
    data.setdefault("personaggi", [])
    data.setdefault("capitoli", [])
    # Safeguard: never exceed the requested number of chapters (credit safety)
    if isinstance(data["capitoli"], list) and len(data["capitoli"]) > num_capitoli:
        data["capitoli"] = data["capitoli"][:num_capitoli]
    return data


async def generate_chapter(book: Dict[str, Any], index: int, instruction: str = "") -> str:
    """Generate the full narrative content for a single chapter, keeping
    continuity with the outline and the previous chapter. An optional
    instruction can steer a rewrite (e.g. make it longer, change tone)."""
    model = book.get("model", "claude-sonnet-4-5-20250929")
    model = model if model in TEXT_MODELS else "claude-sonnet-4-5-20250929"
    provider = _provider_for(model)

    capitoli = book.get("capitoli", [])
    if index < 0 or index >= len(capitoli):
        raise ValueError("Indice capitolo non valido")
    current = capitoli[index]

    outline_lines = []
    for i, c in enumerate(capitoli):
        marker = " <-- DA SCRIVERE ORA" if i == index else ""
        outline_lines.append(
            f"{i + 1}. {c.get('titolo', '')} — {c.get('sommario', '')}{marker}"
        )
    outline_txt = "\n".join(outline_lines)

    prev_txt = ""
    if index > 0:
        prev = capitoli[index - 1].get("contenuto", "")
        if prev:
            prev_txt = f"\nFINE DEL CAPITOLO PRECEDENTE (per continuità diretta):\n...{prev[-1500:]}\n"

    chars = book.get("characters", [])
    chars_txt = _characters_block(chars)

    tono = book.get("tono", "")
    pov = book.get("pov", "")
    length_hint = _length_hint(book.get("lunghezza", "media"))

    riassunto = book.get("riassunto", "")
    summary_txt = (
        f"\nRIASSUNTO DELLA STORIA FINORA (rispetta questi fatti per la coerenza globale):\n{riassunto}\n"
        if riassunto and not instruction
        else ""
    )

    existing_txt = ""
    if instruction and current.get("contenuto"):
        existing_txt = (
            f"\nVERSIONE ATTUALE DEL CAPITOLO (da riscrivere secondo l'istruzione):\n"
            f"{current.get('contenuto')[:2500]}\n"
        )
    instruction_txt = ""
    if instruction:
        instruction_txt = (
            f"\nISTRUZIONE DI RISCRITTURA (priorità assoluta): {instruction}\n"
        )

    system_message = (
        "Sei un pluripremiato romanziere italiano. Scrivi prosa coinvolgente, "
        "vivida e curata, esclusivamente in italiano. Mostra invece di raccontare, "
        "usa dettagli sensoriali e dialoghi credibili. Restituisci solo il testo "
        "narrativo del capitolo, senza titoli, intestazioni o commenti."
    )
    prompt = f"""Stai scrivendo il libro "{book.get('titolo', '')}" ({book.get('genere', '')}).

SINOSSI: {book.get('sinossi', '')}
{_style_directives(tono, pov)}
{summary_txt}
PERSONAGGI:
{chars_txt}

STRUTTURA DEI CAPITOLI:
{outline_txt}
{prev_txt}{existing_txt}{instruction_txt}
Scrivi ORA il contenuto completo del capitolo {index + 1} dal titolo "{current.get('titolo', '')}"
(traccia: {current.get('sommario', '')}).
Lunghezza: {length_hint} (salvo diversa indicazione nell'istruzione). Mantieni coerenza con i capitoli vicini e con il punto di vista indicato.
Non scrivere il titolo del capitolo, solo il testo."""

    return await _chat_text(provider, model, system_message, prompt, max_tokens=5000)


async def update_summary(prev_summary: str, chapter_index: int, chapter_text: str,
                         titolo: str, model: str) -> str:
    """Maintain a concise running 'story so far' summary after each chapter.
    Internal helper (does not consume user credits)."""
    model = model if model in TEXT_MODELS else "claude-sonnet-4-5-20250929"
    provider = _provider_for(model)
    system_message = (
        "Sei un assistente editoriale. Riassumi in italiano in modo conciso e fattuale, "
        "senza commenti né abbellimenti."
    )
    prompt = f"""RIASSUNTO DELLA STORIA FINORA (può essere vuoto se è l'inizio):
{prev_summary or "(nessuno: questo è il primo capitolo)"}

NUOVO CAPITOLO {chapter_index + 1} ("{titolo}"):
{chapter_text[:4000]}

Aggiorna il riassunto integrando gli eventi salienti del nuovo capitolo.
Scrivi 4-8 frasi in italiano con i soli fatti chiave (eventi, rivelazioni, evoluzione
dei personaggi e delle relazioni, luoghi). Niente commenti. Restituisci solo il riassunto."""
    result = await _chat_text(
        provider, model, system_message, prompt, max_tokens=600, retries=1
    )
    return result.strip()


def _cover_prompt(title: str, genere: str, sinossi: str, style: str) -> str:
    return (
        f"Professional, award-winning book cover illustration for a novel titled '{title}'. "
        f"Genre: {genere}. Art direction / visual style: {style}. "
        f"Story essence: {sinossi[:400]}. "
        "Strong focal subject, evocative symbolism coherent with the genre, "
        "dramatic cinematic lighting, rich color grading, depth and atmosphere, "
        "premium publishing quality, vertical portrait composition (taller than wide). "
        "Negative: no text, no letters, no title, no watermark, no frame, no typography."
    )


async def generate_cover(title: str, genere: str, sinossi: str, model: str,
                         style: str, reference_image: Optional[str] = None) -> str:
    """Generate a book cover. Returns a base64 data URI (PNG/JPEG).
    An optional reference_image (data URI or raw base64) guides the result
    (supported only via Nano Banana editing)."""
    prompt = _cover_prompt(title, genere, sinossi, style or "elegante e cinematografico")
    image_model = "gpt-image-1" if model == "gpt-image-1" else "gemini-nano-banana"

    ref_b64 = None
    if reference_image and image_model != "gpt-image-1":
        ref_b64 = reference_image.split(",", 1)[1] if "," in reference_image else reference_image

    return await _generate_image(prompt, image_model, reference_b64=ref_b64)


async def generate_portrait(character: dict, model: str = "gemini-nano-banana") -> str:
    """Generate a character portrait. Returns a base64 data URI (PNG/JPEG)."""
    nome = character.get("nome", "Personaggio")
    ruolo = character.get("ruolo", "")
    descr = character.get("descrizione", "")
    abilita = character.get("abilita", "")
    forza = character.get("punti_forza", "")
    prompt = (
        f"Detailed character portrait of a fictional book character named {nome}. "
        f"Role: {ruolo}. Appearance and personality: {descr}. "
        f"Abilities: {abilita}. Notable strengths: {forza}. "
        "Painterly illustrated portrait, head and shoulders, three-quarter view, "
        "expressive face, atmospheric lighting, rich literary book-illustration style, "
        "single character only, evocative but uncluttered background. "
        "Negative: no text, no letters, no watermark, no multiple people."
    )
    image_model = "gpt-image-1" if model == "gpt-image-1" else "gemini-nano-banana"
    return await _generate_image(prompt, image_model)
