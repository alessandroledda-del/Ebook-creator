"""AI generation service for Libroteca AI.

Handles book text generation (Claude Sonnet 4.5 / GPT-5.2) and
book cover image generation (Gemini Nano Banana / GPT Image 1)
through the Emergent universal LLM key.
"""
import os
import re
import json
import base64
import logging
import uuid
from dotenv import load_dotenv
from pathlib import Path

from emergentintegrations.llm.chat import LlmChat, UserMessage
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


def _provider_for(model: str) -> str:
    return TEXT_MODELS.get(model, "anthropic")


def _extract_json(raw: str) -> dict:
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


def _characters_block(characters: list) -> str:
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


async def generate_book(idea: str, genere: str, model: str, num_capitoli: int,
                        characters: list) -> dict:
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

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"book-{uuid.uuid4().hex}",
        system_message=system_message,
    ).with_model(provider, model).with_params(max_tokens=8000)

    response = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(response)

    # Normalize
    data.setdefault("titolo", "Senza titolo")
    data.setdefault("sottotitolo", "")
    data.setdefault("genere", genere or "Narrativa")
    data.setdefault("sinossi", "")
    data.setdefault("personaggi", [])
    data.setdefault("capitoli", [])
    return data


def _cover_prompt(title: str, genere: str, sinossi: str, style: str) -> str:
    return (
        f"Professional book cover illustration for a novel titled '{title}'. "
        f"Genre: {genere}. Visual style: {style}. "
        f"Story essence: {sinossi[:400]}. "
        "Highly detailed, atmospheric, cinematic lighting, premium publishing quality, "
        "vertical portrait composition, evocative and artistic. "
        "Do NOT render any text, letters or titles on the image."
    )


async def generate_cover(title: str, genere: str, sinossi: str, model: str,
                         style: str) -> str:
    """Generate a book cover. Returns a base64 data URI (PNG)."""
    prompt = _cover_prompt(title, genere, sinossi, style or "elegante e cinematografico")
    image_model = "gpt-image-1" if model == "gpt-image-1" else "gemini-nano-banana"

    if image_model == "gpt-image-1":
        gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        images = await gen.generate_images(
            prompt=prompt, model="gpt-image-1", number_of_images=1, quality="medium"
        )
        if not images:
            raise ValueError("Nessuna immagine generata (GPT Image 1)")
        b64 = base64.b64encode(images[0]).decode("utf-8")
        return f"data:image/png;base64,{b64}"

    # Gemini Nano Banana
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"cover-{uuid.uuid4().hex}",
        system_message="You are a professional book cover illustrator.",
    ).with_model("gemini", IMAGE_MODELS["gemini-nano-banana"]).with_params(
        modalities=["image", "text"]
    )
    _text, images = await chat.send_message_multimodal_response(
        UserMessage(text=prompt)
    )
    if not images:
        raise ValueError("Nessuna immagine generata (Nano Banana)")
    img = images[0]
    return f"data:{img.get('mime_type', 'image/png')};base64,{img['data']}"
