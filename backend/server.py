from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Cookie
from fastapi.responses import StreamingResponse, HTMLResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import html
import base64
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
import secrets
import asyncio
import resend

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
from ebooklib import epub
from xml.sax.saxutils import escape


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


EPUB_CSS = """
body { font-family: Georgia, 'Times New Roman', serif; color: #1C1917; line-height: 1.7; margin: 6% 8%; }
h1 { font-size: 2.2em; text-align: center; line-height: 1.1; margin: 0.4em 0; }
h2 { font-size: 1.5em; margin: 0.2em 0 0.8em; }
p { text-align: justify; margin: 0 0 0.8em; text-indent: 1.2em; }
p.overline { text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.75em; color: #722F37; font-weight: bold; text-align: left; text-indent: 0; }
p.synopsis { font-style: italic; text-align: center; color: #57534E; text-indent: 0; margin-top: 1.5em; }
.title-page { text-align: center; }
"""


def build_book_epub(doc: dict) -> bytes:
    """Render a book document to an EPUB (bytes)."""
    book = epub.EpubBook()
    book.set_identifier(doc.get("id", "libroteca"))
    book.set_title(doc.get("titolo", "Senza titolo"))
    book.set_language("it")
    book.add_author(doc.get("autore") or "Libroteca AI")

    css = epub.EpubItem(
        uid="style", file_name="style/main.css",
        media_type="text/css", content=EPUB_CSS.encode("utf-8"),
    )
    book.add_item(css)

    genere = (doc.get("genere") or "Narrativa").upper()
    titolo = doc.get("titolo", "Senza titolo")
    sottotitolo = doc.get("sottotitolo") or ""
    sinossi = doc.get("sinossi") or ""

    intro = epub.EpubHtml(title=titolo, file_name="title.xhtml", lang="it")
    sub_html = f"<p class='synopsis'>{escape(sottotitolo)}</p>" if sottotitolo else ""
    syn_html = f"<p class='synopsis'>{escape(sinossi)}</p>" if sinossi else ""
    intro.content = (
        f"<html><head></head><body class='title-page'>"
        f"<p class='overline'>{escape(genere)}</p>"
        f"<h1>{escape(titolo)}</h1>{sub_html}{syn_html}</body></html>"
    )
    intro.add_item(css)
    book.add_item(intro)

    toc, spine = [], ["nav", intro]
    for i, ch in enumerate(doc.get("capitoli", [])):
        c = epub.EpubHtml(title=ch.get("titolo", ""), file_name=f"chap_{i + 1}.xhtml", lang="it")
        paras = "".join(
            f"<p>{escape(p.strip())}</p>"
            for p in (ch.get("contenuto", "") or "").split("\n") if p.strip()
        )
        c.content = (
            f"<html><head></head><body>"
            f"<p class='overline'>CAPITOLO {i + 1}</p>"
            f"<h2>{escape(ch.get('titolo', ''))}</h2>{paras}</body></html>"
        )
        c.add_item(css)
        book.add_item(c)
        toc.append(c)
        spine.append(c)

    book.toc = tuple(toc)
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = spine

    out = io.BytesIO()
    epub.write_epub(out, book)
    out.seek(0)
    return out.read()



def build_series_pdf(volumes: list) -> bytes:
    """Render an ordered list of book documents (a saga) to a single PDF."""
    buf = io.BytesIO()
    saga_title = f"Saga di {volumes[0].get('titolo', 'Senza titolo')}"
    pdf = SimpleDocTemplate(
        buf, pagesize=A5,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=22 * mm, bottomMargin=20 * mm,
        title=saga_title,
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
    # Saga title page
    story.append(Spacer(1, 55 * mm))
    story.append(Paragraph("LA SAGA COMPLETA", overline))
    story.append(Paragraph(volumes[0].get("titolo", "Senza titolo"), title_style))
    story.append(Paragraph(f"{len(volumes)} volumi", subtitle_style))
    story.append(PageBreak())

    for doc in volumes:
        story.append(Spacer(1, 50 * mm))
        story.append(Paragraph(f"VOLUME {doc.get('serie_volume', 1)} · {(doc.get('genere') or 'Narrativa').upper()}", overline))
        story.append(Paragraph(doc.get("titolo", "Senza titolo"), title_style))
        if doc.get("sottotitolo"):
            story.append(Paragraph(doc["sottotitolo"], subtitle_style))
        if doc.get("sinossi"):
            story.append(Spacer(1, 8 * mm))
            story.append(Paragraph(doc["sinossi"], synopsis_style))
        story.append(PageBreak())

        for i, ch in enumerate(doc.get("capitoli", [])):
            story.append(Paragraph(f"VOLUME {doc.get('serie_volume', 1)} — CAPITOLO {i + 1}", chapter_over))
            story.append(Paragraph(ch.get("titolo", ""), chapter_title))
            for para in (ch.get("contenuto", "") or "").split("\n"):
                para = para.strip()
                if para:
                    story.append(Paragraph(para, body_style))
            story.append(PageBreak())

    pdf.build(story)
    buf.seek(0)
    return buf.read()


def build_series_epub(volumes: list) -> bytes:
    """Render an ordered list of book documents (a saga) to a single EPUB."""
    book = epub.EpubBook()
    root = volumes[0]
    saga_title = f"Saga di {root.get('titolo', 'Senza titolo')}"
    book.set_identifier(f"saga-{root.get('id', 'libroteca')}")
    book.set_title(saga_title)
    book.set_language("it")
    book.add_author("Libroteca AI")

    css = epub.EpubItem(
        uid="style", file_name="style/main.css",
        media_type="text/css", content=EPUB_CSS.encode("utf-8"),
    )
    book.add_item(css)

    saga_page = epub.EpubHtml(title=saga_title, file_name="saga.xhtml", lang="it")
    saga_page.content = (
        f"<html><head></head><body class='title-page'>"
        f"<p class='overline'>LA SAGA COMPLETA</p>"
        f"<h1>{escape(root.get('titolo', 'Senza titolo'))}</h1>"
        f"<p class='synopsis'>{len(volumes)} volumi</p></body></html>"
    )
    saga_page.add_item(css)
    book.add_item(saga_page)

    toc, spine = [], ["nav", saga_page]
    for doc in volumes:
        vol = doc.get("serie_volume", 1)
        titolo = doc.get("titolo", "Senza titolo")
        sub = f"<p class='synopsis'>{escape(doc.get('sottotitolo') or '')}</p>" if doc.get("sottotitolo") else ""
        syn = f"<p class='synopsis'>{escape(doc.get('sinossi') or '')}</p>" if doc.get("sinossi") else ""
        vol_page = epub.EpubHtml(title=f"Vol. {vol} — {titolo}", file_name=f"vol_{vol}.xhtml", lang="it")
        vol_page.content = (
            f"<html><head></head><body class='title-page'>"
            f"<p class='overline'>VOLUME {vol} · {escape((doc.get('genere') or 'Narrativa').upper())}</p>"
            f"<h1>{escape(titolo)}</h1>{sub}{syn}</body></html>"
        )
        vol_page.add_item(css)
        book.add_item(vol_page)
        spine.append(vol_page)

        vol_chapters = []
        for i, ch in enumerate(doc.get("capitoli", [])):
            c = epub.EpubHtml(
                title=ch.get("titolo", ""), file_name=f"vol_{vol}_chap_{i + 1}.xhtml", lang="it"
            )
            paras = "".join(
                f"<p>{escape(p.strip())}</p>"
                for p in (ch.get("contenuto", "") or "").split("\n") if p.strip()
            )
            c.content = (
                f"<html><head></head><body>"
                f"<p class='overline'>VOLUME {vol} — CAPITOLO {i + 1}</p>"
                f"<h2>{escape(ch.get('titolo', ''))}</h2>{paras}</body></html>"
            )
            c.add_item(css)
            book.add_item(c)
            vol_chapters.append(c)
            spine.append(c)
        toc.append((epub.Section(f"Vol. {vol} — {titolo}", href=f"vol_{vol}.xhtml"), tuple(vol_chapters)))

    book.toc = tuple(toc)
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())
    book.spine = spine

    out = io.BytesIO()
    epub.write_epub(out, book)
    out.seek(0)
    return out.read()


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
    tono: Optional[str] = "avvincente e coinvolgente"
    lunghezza: Optional[str] = "media"
    pov: Optional[str] = "terza"
    characters: List[Character] = []
    parent_book_id: Optional[str] = None


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
    use_parent_cover: bool = False


# ---------------------- Auth helpers ----------------------
JWT_ALGORITHM = "HS256"


def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, user_id: str):
    response.set_cookie(
        key="access_token", value=create_access_token(user_id),
        httponly=True, secure=True, samesite="none", max_age=900, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=create_refresh_token(user_id),
        httponly=True, secure=True, samesite="none", max_age=604800, path="/",
    )


MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


async def check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if not rec:
        return
    locked_until = rec.get("locked_until")
    if locked_until:
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until)
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(
                status_code=429,
                detail="Troppi tentativi falliti. Riprova tra qualche minuto.",
            )
        await db.login_attempts.delete_one({"identifier": identifier})


async def record_failed_login(identifier: str):
    rec = await db.login_attempts.find_one_and_update(
        {"identifier": identifier},
        {"$inc": {"count": 1}},
        upsert=True, return_document=True,
    )
    if rec and rec.get("count", 0) >= MAX_LOGIN_ATTEMPTS:
        locked = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"locked_until": locked.isoformat(), "count": 0}},
        )


def _client_identifier(request: Request, email: str) -> str:
    fwd = request.headers.get("X-Forwarded-For", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
    return f"{ip}:{email}"


async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(default=None),
) -> User:
    bearer = None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        bearer = auth[7:]

    # 1) JWT (email/password login)
    for tok in (request.cookies.get("access_token"), bearer):
        if not tok:
            continue
        try:
            payload = jwt.decode(tok, _jwt_secret(), algorithms=[JWT_ALGORITHM])
            if payload.get("type") == "access":
                user_doc = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
                if user_doc:
                    return User(**user_doc)
        except jwt.PyJWTError:
            pass

    # 2) Emergent Google session
    token = session_token or bearer
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
        origin = request.headers.get("Origin", "")
        asyncio.create_task(_send_welcome_safe(email, data.get("name", ""), f"{origin}/crea"))

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
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


# ---------------------- Email/Password auth ----------------------
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@api_router.post("/auth/register")
async def register(payload: RegisterRequest, request: Request, response: Response):
    email = payload.email.strip().lower()
    name = payload.name.strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Email non valida")
    if not name:
        raise HTTPException(status_code=400, detail="Il nome è obbligatorio")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="La password deve avere almeno 6 caratteri")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Esiste già un account con questa email. Accedi oppure usa Google.",
        )

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": "",
        "auth_provider": "email",
        "password_hash": hash_password(payload.password),
        "credits": WELCOME_CREDITS,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    set_auth_cookies(response, user_id)
    origin = request.headers.get("Origin", "")
    asyncio.create_task(_send_welcome_safe(email, name, f"{origin}/crea"))
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return User(**user_doc)


@api_router.post("/auth/login")
async def login(payload: LoginRequest, request: Request, response: Response):
    email = payload.email.strip().lower()
    identifier = _client_identifier(request, email)
    await check_lockout(identifier)

    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc:
        await record_failed_login(identifier)
        raise HTTPException(status_code=401, detail="Email o password non validi")
    if not user_doc.get("password_hash"):
        raise HTTPException(
            status_code=400,
            detail="Questo account usa l'accesso con Google. Usa il pulsante Google per entrare.",
        )
    if not verify_password(payload.password, user_doc["password_hash"]):
        await record_failed_login(identifier)
        raise HTTPException(status_code=401, detail="Email o password non validi")

    await db.login_attempts.delete_one({"identifier": identifier})
    set_auth_cookies(response, user_doc["user_id"])
    return User(**user_doc)


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token mancante")
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Refresh token non valido")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Tipo di token non valido")
    user_doc = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    response.set_cookie(
        key="access_token", value=create_access_token(user_doc["user_id"]),
        httponly=True, secure=True, samesite="none", max_age=900, path="/",
    )
    return {"ok": True}


WELCOME_EMAIL_HTML = """
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFBF7;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #E7E5E4;border-radius:4px;">
      <tr><td style="background-color:#722F37;padding:28px 40px;">
        <span style="color:#ffffff;font-size:24px;letter-spacing:-0.5px;">Libroteca</span>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="color:#722F37;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;margin:0 0 12px;">Benvenuto nella tua casa editrice</p>
        <h1 style="color:#1C1917;font-size:26px;margin:0 0 16px;font-weight:normal;">Ciao {name},</h1>
        <p style="color:#57534E;font-size:15px;line-height:1.7;margin:0 0 20px;font-family:Arial,sans-serif;">
          Il tuo account Libroteca è pronto. Da una semplice idea, l'AI costruisce la trama,
          scrive i capitoli in italiano, dà vita ai personaggi e disegna la copertina.
        </p>
        <table cellpadding="0" cellspacing="0" width="100%" style="background-color:#F5F3EC;border-radius:4px;margin:0 0 28px;">
          <tr><td style="padding:20px 24px;">
            <p style="color:#722F37;font-size:28px;margin:0;font-weight:bold;">15 crediti omaggio</p>
            <p style="color:#57534E;font-size:13px;margin:6px 0 0;font-family:Arial,sans-serif;">già sul tuo account, per scrivere il tuo primo libro.</p>
          </td></tr>
        </table>
        <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#722F37;border-radius:2px;">
          <a href="{app_link}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-family:Arial,sans-serif;font-weight:bold;">Scrivi il tuo primo libro</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #E7E5E4;padding:20px 40px;">
        <p style="color:#A8A29E;font-size:11px;margin:0;font-family:Arial,sans-serif;">Libroteca — La tua casa editrice personale, potenziata dall'AI.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
"""


async def send_welcome_email(to_email: str, name: str, app_link: str):
    resend.api_key = os.environ["RESEND_API_KEY"]
    params = {
        "from": f"Libroteca <{os.environ['SENDER_EMAIL']}>",
        "to": [to_email],
        "subject": "Benvenuto in Libroteca — 15 crediti omaggio ti aspettano",
        "html": WELCOME_EMAIL_HTML.replace("{name}", name or "").replace("{app_link}", app_link or ""),
    }
    return await asyncio.to_thread(resend.Emails.send, params)


async def _send_welcome_safe(to_email: str, name: str, app_link: str):
    try:
        await send_welcome_email(to_email, name, app_link)
        logger.info(f"Email di benvenuto inviata a {to_email}")
    except Exception as e:
        logger.error(f"Invio email di benvenuto fallito per {to_email}: {e}")


RESET_EMAIL_HTML = """
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFBF7;padding:40px 0;font-family:Georgia,'Times New Roman',serif;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #E7E5E4;border-radius:4px;">
      <tr><td style="background-color:#722F37;padding:28px 40px;">
        <span style="color:#ffffff;font-size:24px;letter-spacing:-0.5px;">Libroteca</span>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="color:#722F37;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:bold;margin:0 0 12px;">Reimposta la password</p>
        <h1 style="color:#1C1917;font-size:26px;margin:0 0 16px;font-weight:normal;">Ciao {name},</h1>
        <p style="color:#57534E;font-size:15px;line-height:1.7;margin:0 0 28px;font-family:Arial,sans-serif;">
          Abbiamo ricevuto una richiesta per reimpostare la password del tuo account Libroteca.
          Clicca il pulsante qui sotto per scegliere una nuova password. Il link è valido per 1 ora.
        </p>
        <table cellpadding="0" cellspacing="0"><tr><td style="background-color:#722F37;border-radius:2px;">
          <a href="{reset_link}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-family:Arial,sans-serif;font-weight:bold;">Reimposta la password</a>
        </td></tr></table>
        <p style="color:#A8A29E;font-size:12px;line-height:1.6;margin:28px 0 0;font-family:Arial,sans-serif;">
          Se non hai richiesto tu il reset, ignora questa email: la tua password resterà invariata.
        </p>
      </td></tr>
      <tr><td style="border-top:1px solid #E7E5E4;padding:20px 40px;">
        <p style="color:#A8A29E;font-size:11px;margin:0;font-family:Arial,sans-serif;">Libroteca — La tua casa editrice personale, potenziata dall'AI.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
"""


async def send_reset_email(to_email: str, name: str, reset_link: str):
    resend.api_key = os.environ["RESEND_API_KEY"]
    params = {
        "from": f"Libroteca <{os.environ['SENDER_EMAIL']}>",
        "to": [to_email],
        "subject": "Reimposta la tua password — Libroteca",
        "html": RESET_EMAIL_HTML.replace("{name}", name or "").replace("{reset_link}", reset_link),
    }
    return await asyncio.to_thread(resend.Emails.send, params)


@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    email = payload.email.strip().lower()
    user_doc = await db.users.find_one({"email": email, "password_hash": {"$exists": True}}, {"_id": 0})
    if user_doc:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user_doc["user_id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
        })
        origin = request.headers.get("Origin", "")
        reset_link = f"{origin}/reset-password?token={token}"
        logger.info(f"[RESET PASSWORD] Link per {email}: {reset_link}")
        try:
            await send_reset_email(email, user_doc.get("name", ""), reset_link)
        except Exception as e:
            logger.error(f"Invio email di reset fallito per {email}: {e}")
    return {"message": "Se l'email è registrata, riceverai un link per reimpostare la password."}


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="La password deve avere almeno 6 caratteri")
    rec = await db.password_reset_tokens.find_one({"token": payload.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Link di reset non valido o già usato")
    expires_at = rec["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Link di reset scaduto")
    await db.users.update_one(
        {"user_id": rec["user_id"]},
        {"$set": {"password_hash": hash_password(payload.password)}},
    )
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"message": "Password aggiornata. Ora puoi accedere."}


class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = ""
    new_password: str


class ChangeEmailRequest(BaseModel):
    new_email: str
    password: str


@api_router.get("/auth/account")
async def account_info(user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    has_password = bool(doc.get("password_hash"))
    return {
        "email": doc["email"],
        "name": doc.get("name", ""),
        "has_password": has_password,
        "auth_provider": doc.get("auth_provider") or ("email" if has_password else "google"),
        "credits": doc.get("credits", 0),
    }


@api_router.get("/auth/stats")
async def writer_stats(user: User = Depends(get_current_user)):
    books = await db.books.find(
        {"user_id": user.user_id},
        {"_id": 0, "capitoli": 1, "genere": 1, "status": 1, "cover_image": 1,
         "characters": 1, "serie_root_id": 1},
    ).to_list(500)

    total_words = 0
    chapters_written = 0
    genres = {}
    covers = 0
    characters = 0
    for b in books:
        for ch in b.get("capitoli", []):
            content = (ch.get("contenuto") or "").strip()
            if content:
                chapters_written += 1
                total_words += len(content.split())
        g = (b.get("genere") or "").strip()
        if g:
            genres[g] = genres.get(g, 0) + 1
        if b.get("cover_image"):
            covers += 1
        characters += len(b.get("characters", []))

    completed = sum(1 for b in books if b.get("status") == "completato")
    num_series = len({b.get("serie_root_id") for b in books if b.get("serie_root_id")})
    top_genres = sorted(
        [{"genere": g, "count": c} for g, c in genres.items()],
        key=lambda x: -x["count"],
    )[:6]

    achievements = [
        {"id": "primo_libro", "titolo": "Prima opera", "descrizione": "Crea il tuo primo libro", "achieved": len(books) >= 1},
        {"id": "completato", "titolo": "Parola fine", "descrizione": "Completa un libro", "achieved": completed >= 1},
        {"id": "copertina", "titolo": "Copertinista", "descrizione": "Genera una copertina AI", "achieved": covers >= 1},
        {"id": "romanziere", "titolo": "Romanziere", "descrizione": "Scrivi 10.000 parole", "achieved": total_words >= 10000},
        {"id": "saga", "titolo": "Maestro della saga", "descrizione": "Scrivi il seguito di un libro", "achieved": num_series >= 1},
        {"id": "generi", "titolo": "Poliedrico", "descrizione": "Esplora 3 generi diversi", "achieved": len(genres) >= 3},
        {"id": "biblioteca", "titolo": "Piccola biblioteca", "descrizione": "Crea 5 libri", "achieved": len(books) >= 5},
        {"id": "prolifico", "titolo": "Penna instancabile", "descrizione": "Scrivi 50.000 parole", "achieved": total_words >= 50000},
    ]

    return {
        "total_words": total_words,
        "total_books": len(books),
        "completed_books": completed,
        "chapters_written": chapters_written,
        "num_series": num_series,
        "covers_generated": covers,
        "characters_created": characters,
        "top_genres": top_genres,
        "achievements": achievements,
    }


@api_router.post("/auth/change-password")
async def change_password(payload: ChangePasswordRequest, user: User = Depends(get_current_user)):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 6 caratteri")
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if doc.get("password_hash"):
        if not verify_password(payload.current_password or "", doc["password_hash"]):
            raise HTTPException(status_code=400, detail="La password attuale non è corretta")
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"password_hash": hash_password(payload.new_password)}},
    )
    return {"message": "Password aggiornata con successo."}


@api_router.post("/auth/change-email")
async def change_email(payload: ChangeEmailRequest, user: User = Depends(get_current_user)):
    new_email = payload.new_email.strip().lower()
    if "@" not in new_email or "." not in new_email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Email non valida")
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not doc.get("password_hash"):
        raise HTTPException(
            status_code=400,
            detail="Il tuo account usa l'accesso Google: l'email non può essere modificata. Imposta prima una password.",
        )
    if not verify_password(payload.password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="La password non è corretta")
    if new_email != doc["email"] and await db.users.find_one({"email": new_email}):
        raise HTTPException(status_code=400, detail="Questa email è già usata da un altro account")
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"email": new_email}})
    updated = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return User(**updated)


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
        "serie_volume": doc.get("serie_volume", 1),
        "parent_titolo": doc.get("parent_titolo", ""),
        "serie_root_id": doc.get("serie_root_id", ""),
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

    serie_fields = {}
    if payload.parent_book_id:
        parent = await db.books.find_one(
            {"id": payload.parent_book_id, "user_id": user.user_id}, {"_id": 0}
        )
        if not parent:
            raise HTTPException(status_code=404, detail="Libro precedente non trovato")
        if not characters:
            characters = parent.get("characters", [])
        outline_prev = "\n".join(
            f"{i + 1}. {c.get('titolo', '')} — {c.get('sommario', '')}"
            for i, c in enumerate(parent.get("capitoli", []))
        )
        contesto = (
            f"TITOLO DEL VOLUME PRECEDENTE: {parent.get('titolo', '')}\n"
            f"SINOSSI DEL VOLUME PRECEDENTE: {parent.get('sinossi', '')}\n"
            f"RIASSUNTO DEGLI EVENTI DEL VOLUME PRECEDENTE: {parent.get('riassunto', '') or '(non disponibile)'}\n"
            f"STRUTTURA DEI CAPITOLI DEL VOLUME PRECEDENTE:\n{outline_prev}"
        )
        serie_fields = {
            "parent_book_id": parent["id"],
            "parent_titolo": parent.get("titolo", ""),
            "serie_volume": int(parent.get("serie_volume") or 1) + 1,
            "serie_root_id": parent.get("serie_root_id") or parent["id"],
            "contesto_serie": contesto,
        }

    doc = {
        "id": book_id,
        "user_id": user.user_id,
        "idea": payload.idea,
        "genere": payload.genere or "",
        "model": payload.model,
        "num_capitoli_richiesti": payload.num_capitoli,
        "tono": payload.tono or "avvincente e coinvolgente",
        "lunghezza": payload.lunghezza or "media",
        "pov": payload.pov or "terza",
        "titolo": "",
        "sottotitolo": "",
        "sinossi": "",
        "characters": characters,
        "capitoli": [],
        "cover_image": "",
        "cover_model": "",
        "status": "bozza",
        "created_at": datetime.now(timezone.utc).isoformat(),
        **serie_fields,
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
            tono=doc.get("tono", ""),
            pov=doc.get("pov", ""),
            serie_context=doc.get("contesto_serie", ""),
            serie_volume=doc.get("serie_volume", 1),
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
        "riassunto": "",
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
    set_fields = {"capitoli": capitoli, "status": status}

    # Maintain a running "story so far" summary for long-book coherence.
    # Non-fatal: a failure here must not break chapter generation.
    try:
        new_summary = await ai_service.update_summary(
            doc.get("riassunto", ""),
            payload.index,
            contenuto,
            capitoli[payload.index].get("titolo", ""),
            doc.get("model", "claude-sonnet-4-5-20250929"),
        )
        if new_summary:
            set_fields["riassunto"] = new_summary
    except Exception as e:
        logger.warning(f"Aggiornamento riassunto fallito (non bloccante): {e}")

    await db.books.update_one({"id": book_id}, {"$set": set_fields})
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


@api_router.get("/books/{book_id}/export/epub")
async def export_book_epub(book_id: str, user: User = Depends(get_current_user)):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    epub_bytes = build_book_epub(doc)
    filename = (doc.get("titolo") or "libro").replace(" ", "_")[:40]
    return StreamingResponse(
        iter([epub_bytes]),
        media_type="application/epub+zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}.epub"'},
    )


async def _get_series_volumes(root_id: str, user: User) -> list:
    docs = await db.books.find(
        {"user_id": user.user_id, "$or": [{"id": root_id}, {"serie_root_id": root_id}]},
        {"_id": 0},
    ).to_list(50)
    if len(docs) < 2:
        raise HTTPException(status_code=404, detail="Serie non trovata")
    docs.sort(key=lambda d: d.get("serie_volume") or 1)
    return docs


@api_router.get("/series/{root_id}/export")
async def export_series_pdf(root_id: str, user: User = Depends(get_current_user)):
    volumes = await _get_series_volumes(root_id, user)
    pdf_bytes = build_series_pdf(volumes)
    filename = f"Saga_{(volumes[0].get('titolo') or 'serie').replace(' ', '_')[:40]}"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )


@api_router.get("/series/{root_id}/export/epub")
async def export_series_epub(root_id: str, user: User = Depends(get_current_user)):
    volumes = await _get_series_volumes(root_id, user)
    epub_bytes = build_series_epub(volumes)
    filename = f"Saga_{(volumes[0].get('titolo') or 'serie').replace(' ', '_')[:40]}"
    return StreamingResponse(
        iter([epub_bytes]),
        media_type="application/epub+zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}.epub"'},
    )



@api_router.post("/books/{book_id}/cover")
async def generate_book_cover(
    book_id: str, payload: CoverRequest, user: User = Depends(get_current_user)
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    cost = await ensure_credits(user.user_id, "cover")

    model = payload.model
    style = payload.style
    reference_image = payload.reference_image
    if payload.use_parent_cover:
        if not doc.get("parent_book_id"):
            raise HTTPException(status_code=400, detail="Questo libro non fa parte di una serie")
        parent = await db.books.find_one(
            {"id": doc["parent_book_id"], "user_id": user.user_id}, {"_id": 0}
        )
        if not parent or not parent.get("cover_image"):
            raise HTTPException(
                status_code=400,
                detail="Il volume precedente non ha ancora una copertina: generala prima.",
            )
        reference_image = parent["cover_image"]
        model = "gemini-nano-banana"
        style = (
            f"{payload.style or 'elegante e cinematografico'}, perfettamente coerente con "
            "lo stile artistico, la palette di colori e l'identità visiva della copertina "
            "di riferimento: deve sembrare il volume successivo della stessa serie editoriale"
        )

    try:
        cover = await ai_service.generate_cover(
            title=doc.get("titolo") or doc.get("idea", "Libro"),
            genere=doc.get("genere", ""),
            sinossi=doc.get("sinossi", "") or doc.get("idea", ""),
            model=model,
            style=style,
            reference_image=reference_image,
        )
    except Exception as e:
        logger.error(f"Generazione copertina fallita: {e}")
        raise HTTPException(status_code=500, detail=f"Copertina fallita: {str(e)}")

    await db.books.update_one(
        {"id": book_id},
        {"$set": {"cover_image": cover, "cover_model": model}},
    )
    await deduct_credits(user.user_id, cost)
    return {"cover_image": cover, "cover_model": model}


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


OG_FALLBACK_IMAGE = "https://static.prod-images.emergentagent.com/jobs/ee7f107e-edbd-4e3f-a701-bf5c98274a64/images/fab09ff9c59861f74d2a04fdbfd3c4ec25a7bd7a732d106285a978b550f21c7a.png"


@api_router.get("/public/books/{public_id}/cover")
async def public_book_cover(public_id: str):
    """Serve the cover as a real image (Open Graph requires a fetchable URL)."""
    doc = await db.books.find_one(
        {"public_id": public_id, "is_public": True}, {"_id": 0, "cover_image": 1}
    )
    cover = doc.get("cover_image") if doc else None
    if not cover:
        return RedirectResponse(OG_FALLBACK_IMAGE)
    if "," in cover:
        header, b64 = cover.split(",", 1)
        mime = header.split(":", 1)[1].split(";", 1)[0] if ":" in header else "image/png"
    else:
        b64, mime = cover, "image/png"
    try:
        raw = base64.b64decode(b64)
    except Exception:
        return RedirectResponse(OG_FALLBACK_IMAGE)
    return Response(content=raw, media_type=mime, headers={"Cache-Control": "public, max-age=3600"})


@api_router.get("/share/{public_id}", response_class=HTMLResponse)
async def share_page(public_id: str, request: Request):
    """HTML page with Open Graph / Twitter meta tags for social crawlers.
    Human visitors are redirected to the in-app reader."""
    xf_host = request.headers.get("x-forwarded-host")
    host = xf_host or request.headers.get("host", "")
    proto = request.headers.get("x-forwarded-proto", "https")
    base = f"{proto}://{host}" if host else str(request.base_url).rstrip("/")
    reader_path = f"/p/{public_id}"          # relative: always resolves to public origin
    reader_url = f"{base}{reader_path}"       # absolute: for og:url

    doc = await db.books.find_one(
        {"public_id": public_id, "is_public": True},
        {"_id": 0, "titolo": 1, "sinossi": 1, "genere": 1, "cover_image": 1},
    )
    if not doc:
        return HTMLResponse(
            "<!doctype html><html><head><meta http-equiv='refresh' content='0; url=/'>"
            "<script>location.replace('/')</script></head><body></body></html>"
        )

    title = html.escape(doc.get("titolo") or "Un libro su Libroteca")
    desc = html.escape((doc.get("sinossi") or "Creato con Libroteca, la casa editrice AI.")[:200])
    image = f"{base}/api/public/books/{public_id}/cover" if doc.get("cover_image") else OG_FALLBACK_IMAGE

    page = f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title} · Libroteca</title>
<meta name="description" content="{desc}" />
<meta property="og:type" content="book" />
<meta property="og:site_name" content="Libroteca" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:image" content="{image}" />
<meta property="og:image:width" content="1024" />
<meta property="og:image:height" content="1024" />
<meta property="og:url" content="{reader_url}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<meta name="twitter:image" content="{image}" />
<meta http-equiv="refresh" content="0; url={reader_path}" />
<script>window.location.replace("{reader_path}");</script>
</head>
<body style="font-family:system-ui;background:#FDFBF7;color:#1C1917;text-align:center;padding:80px 20px;">
<p>Reindirizzamento al libro <strong>{title}</strong>…</p>
<p><a href="{reader_path}" style="color:#722F37;">Apri il libro</a></p>
</body>
</html>"""
    return HTMLResponse(page)



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


@app.on_event("startup")
async def startup_auth():
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"Indice email non creato: {e}")
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

    test_email = "test@libroteca.ai"
    test_password = "Test1234!"
    existing = await db.users.find_one({"email": test_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": test_email,
            "name": "Utente Test",
            "picture": "",
            "auth_provider": "email",
            "password_hash": hash_password(test_password),
            "credits": WELCOME_CREDITS,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(test_password, existing.get("password_hash") or ""):
        await db.users.update_one(
            {"email": test_email},
            {"$set": {"password_hash": hash_password(test_password)}},
        )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
