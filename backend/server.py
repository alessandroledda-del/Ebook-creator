from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Cookie
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import httpx

import ai_service
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

import io
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
)


def build_book_pdf(doc: dict) -> bytes:
    """Render a book document to a nicely typeset PDF (bytes)."""
    buf = io.BytesIO()
    pdf = SimpleDocTemplate(
        buf, pagesize=A5,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=22 * mm, bottomMargin=20 * mm,
        title=doc.get("titolo", "Libro"),
    )
    base = getSampleStyleSheet()
    wine = HexColor("#722F37")
    ink = HexColor("#1C1917")

    title_style = ParagraphStyle(
        "BookTitle", parent=base["Title"], fontName="Times-Bold",
        fontSize=30, leading=34, textColor=ink, alignment=TA_CENTER, spaceAfter=10,
    )
    subtitle_style = ParagraphStyle(
        "BookSub", parent=base["Normal"], fontName="Times-Italic",
        fontSize=14, leading=18, textColor=wine, alignment=TA_CENTER, spaceAfter=24,
    )
    overline = ParagraphStyle(
        "Overline", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=9, textColor=wine, alignment=TA_CENTER, spaceAfter=8,
    )
    synopsis_style = ParagraphStyle(
        "Synopsis", parent=base["Normal"], fontName="Times-Italic",
        fontSize=11, leading=17, textColor=ink, alignment=TA_CENTER,
    )
    chapter_over = ParagraphStyle(
        "ChapOver", parent=base["Normal"], fontName="Helvetica-Bold",
        fontSize=9, textColor=wine, spaceAfter=4,
    )
    chapter_title = ParagraphStyle(
        "ChapTitle", parent=base["Heading1"], fontName="Times-Bold",
        fontSize=20, leading=24, textColor=ink, spaceAfter=18,
    )
    body_style = ParagraphStyle(
        "Body", parent=base["Normal"], fontName="Times-Roman",
        fontSize=11.5, leading=18, textColor=ink, alignment=TA_JUSTIFY, spaceAfter=10,
    )

    story = []
    story.append(Spacer(1, 50 * mm))
    story.append(Paragraph((doc.get("genere") or "Narrativa").upper(), overline))
    story.append(Paragraph(doc.get("titolo", "Senza titolo"), title_style))
    if doc.get("sottotitolo"):
        story.append(Paragraph(doc["sottotitolo"], subtitle_style))
    if doc.get("sinossi"):
        story.append(Spacer(1, 8 * mm))
        story.append(Paragraph(doc["sinossi"], synopsis_style))
    story.append(PageBreak())

    for i, ch in enumerate(doc.get("capitoli", [])):
        story.append(Paragraph(f"CAPITOLO {i + 1}", chapter_over))
        story.append(Paragraph(ch.get("titolo", ""), chapter_title))
        for para in (ch.get("contenuto", "") or "").split("\n"):
            para = para.strip()
            if para:
                story.append(Paragraph(para, body_style))
        story.append(PageBreak())

    pdf.build(story)
    buf.seek(0)
    return buf.read()



ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


# ---------------------- Models ----------------------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = ""
    credits: int = 0


# ---------------------- Credits / Payments config ----------------------
WELCOME_CREDITS = 15

CREDIT_COSTS = {
    "outline": 1,
    "chapter": 1,
    "regenerate": 1,
    "cover": 2,
    "portrait": 2,
}

CREDIT_PACKAGES = {
    "starter": {"name": "Starter", "credits": 25, "amount": 4.99, "currency": "eur"},
    "plus": {"name": "Plus", "credits": 70, "amount": 11.99, "currency": "eur"},
    "pro": {"name": "Pro", "credits": 180, "amount": 24.99, "currency": "eur"},
}


async def ensure_credits(user_id: str, action: str):
    cost = CREDIT_COSTS.get(action, 1)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if (user.get("credits") or 0) < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Crediti insufficienti: servono {cost} crediti per questa azione.",
        )
    return cost


async def deduct_credits(user_id: str, cost: int):
    await db.users.update_one({"user_id": user_id}, {"$inc": {"credits": -cost}})


class Character(BaseModel):
    id: str = Field(default_factory=lambda: f"char_{uuid.uuid4().hex[:10]}")
    nome: str
    ruolo: Optional[str] = ""
    descrizione: Optional[str] = ""
    abilita: Optional[str] = ""
    punti_forza: Optional[str] = ""
    punti_debolezza: Optional[str] = ""


class Chapter(BaseModel):
    titolo: str
    contenuto: str


class BookCreate(BaseModel):
    idea: str
    genere: Optional[str] = ""
    model: str = "claude-sonnet-4-5-20250929"
    num_capitoli: int = 5
    characters: List[Character] = []


class CharacterInput(BaseModel):
    nome: str
    ruolo: Optional[str] = ""
    descrizione: Optional[str] = ""
    abilita: Optional[str] = ""
    punti_forza: Optional[str] = ""
    punti_debolezza: Optional[str] = ""


class CoverRequest(BaseModel):
    model: str = "gemini-nano-banana"
    style: Optional[str] = "elegante e cinematografico"
    reference_image: Optional[str] = None


# ---------------------- Auth helpers ----------------------
async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
) -> User:
    token = session_token
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non autenticato")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Sessione non valida")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessione scaduta")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return User(**user_doc)


# ---------------------- Auth routes ----------------------
@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id mancante")

    async with httpx.AsyncClient() as http:
        r = await http.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Autenticazione fallita")
    data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        update_fields = {"name": data.get("name", ""), "picture": data.get("picture", "")}
        if existing.get("credits") is None:
            update_fields["credits"] = WELCOME_CREDITS
        await db.users.update_one({"user_id": user_id}, {"$set": update_fields})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "credits": WELCOME_CREDITS,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return User(**user_doc)


@api_router.get("/auth/me", response_model=User)
async def auth_me(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------------------- Book helpers ----------------------
def _book_summary(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "titolo": doc.get("titolo", ""),
        "sottotitolo": doc.get("sottotitolo", ""),
        "genere": doc.get("genere", ""),
        "sinossi": doc.get("sinossi", ""),
        "idea": doc.get("idea", ""),
        "status": doc.get("status", "bozza"),
        "model": doc.get("model", ""),
        "cover_image": doc.get("cover_image", ""),
        "cover_model": doc.get("cover_model", ""),
        "num_capitoli": len(doc.get("capitoli", [])),
        "created_at": doc.get("created_at", ""),
    }


# ---------------------- Book routes ----------------------
@api_router.get("/books")
async def list_books(user: User = Depends(get_current_user)):
    docs = await db.books.find({"user_id": user.user_id}, {"_id": 0}).sort(
        "created_at", -1
    ).to_list(200)
    return [_book_summary(d) for d in docs]


@api_router.post("/books")
async def create_book(payload: BookCreate, user: User = Depends(get_current_user)):
    book_id = f"book_{uuid.uuid4().hex[:12]}"
    characters = [c.model_dump() for c in payload.characters]
    doc = {
        "id": book_id,
        "user_id": user.user_id,
        "idea": payload.idea,
        "genere": payload.genere or "",
        "model": payload.model,
        "num_capitoli_richiesti": payload.num_capitoli,
        "titolo": "",
        "sottotitolo": "",
        "sinossi": "",
        "characters": characters,
        "capitoli": [],
        "cover_image": "",
        "cover_model": "",
        "status": "bozza",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.books.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/books/{book_id}")
async def get_book(book_id: str, user: User = Depends(get_current_user)):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    return doc


@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str, user: User = Depends(get_current_user)):
    res = await db.books.delete_one({"id": book_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    return {"ok": True}


@api_router.post("/books/{book_id}/generate")
async def generate_book_content(book_id: str, user: User = Depends(get_current_user)):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    try:
        result = await ai_service.generate_book(
            idea=doc["idea"],
            genere=doc.get("genere", ""),
            model=doc.get("model", "claude-sonnet-4-5-20250929"),
            num_capitoli=doc.get("num_capitoli_richiesti", 5),
            characters=doc.get("characters", []),
        )
    except Exception as e:
        logger.error(f"Generazione libro fallita: {e}")
        raise HTTPException(status_code=500, detail=f"Generazione fallita: {str(e)}")

    # merge AI characters with existing (give ids)
    merged_chars = []
    for c in result.get("personaggi", []):
        merged_chars.append({
            "id": f"char_{uuid.uuid4().hex[:10]}",
            "nome": c.get("nome", "Senza nome"),
            "ruolo": c.get("ruolo", ""),
            "descrizione": c.get("descrizione", ""),
            "abilita": c.get("abilita", ""),
            "punti_forza": c.get("punti_forza", ""),
            "punti_debolezza": c.get("punti_debolezza", ""),
        })

    update = {
        "titolo": result.get("titolo", ""),
        "sottotitolo": result.get("sottotitolo", ""),
        "genere": result.get("genere", doc.get("genere", "")),
        "sinossi": result.get("sinossi", ""),
        "capitoli": result.get("capitoli", []),
        "characters": merged_chars if merged_chars else doc.get("characters", []),
        "status": "completato",
    }
    await db.books.update_one({"id": book_id}, {"$set": update})
    doc.update(update)
    return doc


class ChapterRequest(BaseModel):
    index: int


class RegenerateChapterRequest(BaseModel):
    index: int
    instruction: str = ""


class PortraitRequest(BaseModel):
    model: str = "gemini-nano-banana"


@api_router.post("/books/{book_id}/generate-outline")
async def generate_outline_ep(book_id: str, user: User = Depends(get_current_user)):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    cost = await ensure_credits(user.user_id, "outline")
    try:
        result = await ai_service.generate_outline(
            idea=doc["idea"],
            genere=doc.get("genere", ""),
            model=doc.get("model", "claude-sonnet-4-5-20250929"),
            num_capitoli=doc.get("num_capitoli_richiesti", 5),
            characters=doc.get("characters", []),
        )
    except Exception as e:
        logger.error(f"Generazione outline fallita: {e}")
        raise HTTPException(status_code=500, detail=f"Generazione fallita: {str(e)}")

    merged_chars = []
    for c in result.get("personaggi", []):
        merged_chars.append({
            "id": f"char_{uuid.uuid4().hex[:10]}",
            "nome": c.get("nome", "Senza nome"),
            "ruolo": c.get("ruolo", ""),
            "descrizione": c.get("descrizione", ""),
            "abilita": c.get("abilita", ""),
            "punti_forza": c.get("punti_forza", ""),
            "punti_debolezza": c.get("punti_debolezza", ""),
        })

    capitoli = [
        {"titolo": c.get("titolo", f"Capitolo {i + 1}"),
         "sommario": c.get("sommario", ""), "contenuto": ""}
        for i, c in enumerate(result.get("capitoli", []))
    ]

    update = {
        "titolo": result.get("titolo", ""),
        "sottotitolo": result.get("sottotitolo", ""),
        "genere": result.get("genere", doc.get("genere", "")),
        "sinossi": result.get("sinossi", ""),
        "capitoli": capitoli,
        "characters": merged_chars if merged_chars else doc.get("characters", []),
        "status": "in_scrittura",
    }
    await db.books.update_one({"id": book_id}, {"$set": update})
    await deduct_credits(user.user_id, cost)
    doc.update(update)
    return doc


@api_router.post("/books/{book_id}/generate-chapter")
async def generate_chapter_ep(
    book_id: str, payload: ChapterRequest, user: User = Depends(get_current_user)
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    capitoli = doc.get("capitoli", [])
    if payload.index < 0 or payload.index >= len(capitoli):
        raise HTTPException(status_code=400, detail="Indice capitolo non valido")
    cost = await ensure_credits(user.user_id, "chapter")
    try:
        contenuto = await ai_service.generate_chapter(doc, payload.index)
    except Exception as e:
        logger.error(f"Generazione capitolo fallita: {e}")
        raise HTTPException(status_code=500, detail=f"Generazione fallita: {str(e)}")

    capitoli[payload.index]["contenuto"] = contenuto
    done = all(c.get("contenuto") for c in capitoli)
    status = "completato" if done else "in_scrittura"
    await db.books.update_one(
        {"id": book_id}, {"$set": {"capitoli": capitoli, "status": status}}
    )
    await deduct_credits(user.user_id, cost)
    return {
        "index": payload.index,
        "titolo": capitoli[payload.index]["titolo"],
        "contenuto": contenuto,
        "done": done,
        "status": status,
    }


@api_router.post("/books/{book_id}/regenerate-chapter")
async def regenerate_chapter_ep(
    book_id: str, payload: RegenerateChapterRequest,
    user: User = Depends(get_current_user),
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    capitoli = doc.get("capitoli", [])
    if payload.index < 0 or payload.index >= len(capitoli):
        raise HTTPException(status_code=400, detail="Indice capitolo non valido")
    cost = await ensure_credits(user.user_id, "regenerate")
    try:
        contenuto = await ai_service.generate_chapter(
            doc, payload.index, instruction=payload.instruction
        )
    except Exception as e:
        logger.error(f"Rigenerazione capitolo fallita: {e}")
        raise HTTPException(status_code=500, detail=f"Rigenerazione fallita: {str(e)}")

    capitoli[payload.index]["contenuto"] = contenuto
    await db.books.update_one({"id": book_id}, {"$set": {"capitoli": capitoli}})
    await deduct_credits(user.user_id, cost)
    return {
        "index": payload.index,
        "titolo": capitoli[payload.index]["titolo"],
        "contenuto": contenuto,
    }


@api_router.post("/books/{book_id}/characters/{char_id}/portrait")
async def generate_character_portrait(
    book_id: str, char_id: str, payload: PortraitRequest,
    user: User = Depends(get_current_user),
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    chars = doc.get("characters", [])
    target = next((c for c in chars if c.get("id") == char_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Personaggio non trovato")
    cost = await ensure_credits(user.user_id, "portrait")
    try:
        image = await ai_service.generate_portrait(target, model=payload.model)
    except Exception as e:
        logger.error(f"Generazione ritratto fallita: {e}")
        raise HTTPException(status_code=500, detail=f"Ritratto fallito: {str(e)}")

    target["immagine"] = image
    await db.books.update_one({"id": book_id}, {"$set": {"characters": chars}})
    await deduct_credits(user.user_id, cost)
    return {"char_id": char_id, "immagine": image}




@api_router.get("/books/{book_id}/export")
async def export_book_pdf(book_id: str, user: User = Depends(get_current_user)):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    pdf_bytes = build_book_pdf(doc)
    filename = (doc.get("titolo") or "libro").replace(" ", "_")[:40]
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )



@api_router.post("/books/{book_id}/cover")
async def generate_book_cover(
    book_id: str, payload: CoverRequest, user: User = Depends(get_current_user)
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    cost = await ensure_credits(user.user_id, "cover")
    try:
        cover = await ai_service.generate_cover(
            title=doc.get("titolo") or doc.get("idea", "Libro"),
            genere=doc.get("genere", ""),
            sinossi=doc.get("sinossi", "") or doc.get("idea", ""),
            model=payload.model,
            style=payload.style,
            reference_image=payload.reference_image,
        )
    except Exception as e:
        logger.error(f"Generazione copertina fallita: {e}")
        raise HTTPException(status_code=500, detail=f"Copertina fallita: {str(e)}")

    await db.books.update_one(
        {"id": book_id},
        {"$set": {"cover_image": cover, "cover_model": payload.model}},
    )
    await deduct_credits(user.user_id, cost)
    return {"cover_image": cover, "cover_model": payload.model}


# ---------------------- Character routes ----------------------
@api_router.post("/books/{book_id}/characters")
async def add_character(
    book_id: str, payload: CharacterInput, user: User = Depends(get_current_user)
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    char = payload.model_dump()
    char["id"] = f"char_{uuid.uuid4().hex[:10]}"
    await db.books.update_one({"id": book_id}, {"$push": {"characters": char}})
    return char


@api_router.put("/books/{book_id}/characters/{char_id}")
async def update_character(
    book_id: str, char_id: str, payload: CharacterInput,
    user: User = Depends(get_current_user),
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    chars = doc.get("characters", [])
    found = False
    for c in chars:
        if c.get("id") == char_id:
            c.update(payload.model_dump())
            c["id"] = char_id
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Personaggio non trovato")
    await db.books.update_one({"id": book_id}, {"$set": {"characters": chars}})
    return {"ok": True, "characters": chars}


@api_router.delete("/books/{book_id}/characters/{char_id}")
async def delete_character(
    book_id: str, char_id: str, user: User = Depends(get_current_user)
):
    res = await db.books.update_one(
        {"id": book_id, "user_id": user.user_id},
        {"$pull": {"characters": {"id": char_id}}},
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Personaggio non trovato")
    return {"ok": True}

# ---------------------- Public sharing ----------------------
class ShareRequest(BaseModel):
    public: bool = True


@api_router.post("/books/{book_id}/share")
async def share_book(
    book_id: str, payload: ShareRequest, user: User = Depends(get_current_user)
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    if payload.public:
        public_id = doc.get("public_id") or uuid.uuid4().hex[:16]
        await db.books.update_one(
            {"id": book_id}, {"$set": {"is_public": True, "public_id": public_id}}
        )
        return {"is_public": True, "public_id": public_id}
    await db.books.update_one({"id": book_id}, {"$set": {"is_public": False}})
    return {"is_public": False, "public_id": doc.get("public_id", "")}


@api_router.get("/public/books/{public_id}")
async def public_book(public_id: str):
    doc = await db.books.find_one(
        {"public_id": public_id, "is_public": True},
        {"_id": 0, "user_id": 0, "idea": 0, "num_capitoli_richiesti": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato o non pubblico")
    return doc


# ---------------------- Stripe payments ----------------------
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")


class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str


def _stripe(request: Request) -> StripeCheckout:
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


async def _grant_credits_once(session_id: str):
    """Grant package credits exactly once for a paid session."""
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        return
    res = await db.payment_transactions.update_one(
        {"session_id": session_id, "credits_granted": {"$ne": True}},
        {"$set": {"credits_granted": True}},
    )
    if res.modified_count == 1:
        await db.users.update_one(
            {"user_id": txn["user_id"]}, {"$inc": {"credits": txn["credits"]}}
        )


@api_router.get("/payments/packages")
async def list_packages():
    return [{"id": k, **v} for k, v in CREDIT_PACKAGES.items()]


@api_router.post("/payments/checkout")
async def create_checkout(
    payload: CheckoutRequest, request: Request, user: User = Depends(get_current_user)
):
    if payload.package_id not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Pacchetto non valido")
    pkg = CREDIT_PACKAGES[payload.package_id]
    stripe_checkout = _stripe(request)
    success_url = f"{payload.origin_url}/crediti?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payload.origin_url}/crediti"
    metadata = {
        "user_id": user.user_id,
        "package_id": payload.package_id,
        "credits": str(pkg["credits"]),
    }
    req = CheckoutSessionRequest(
        amount=float(pkg["amount"]),
        currency=pkg["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe_checkout.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user.user_id,
        "package_id": payload.package_id,
        "credits": pkg["credits"],
        "amount": float(pkg["amount"]),
        "currency": pkg["currency"],
        "payment_status": "initiated",
        "status": "initiated",
        "credits_granted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/payments/status/{session_id}")
async def payment_status(
    session_id: str, request: Request, user: User = Depends(get_current_user)
):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transazione non trovata")
    stripe_checkout = _stripe(request)
    status = await stripe_checkout.get_checkout_status(session_id)
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": status.status, "payment_status": status.payment_status}},
    )
    if status.payment_status == "paid":
        await _grant_credits_once(session_id)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "payment_status": status.payment_status,
        "status": status.status,
        "credits": user_doc.get("credits", 0),
        "package_credits": txn["credits"],
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    stripe_checkout = _stripe(request)
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Webhook Stripe non valido: {e}")
        raise HTTPException(status_code=400, detail="Webhook non valido")
    if event.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": event.session_id},
            {"$set": {"payment_status": "paid", "status": "complete"}},
        )
        await _grant_credits_once(event.session_id)
    return {"ok": True}




@api_router.get("/")
async def root():
    return {"message": "Libroteca AI API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
