from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, Cookie
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
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", ""), "picture": data.get("picture", "")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
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


@api_router.post("/books/{book_id}/cover")
async def generate_book_cover(
    book_id: str, payload: CoverRequest, user: User = Depends(get_current_user)
):
    doc = await db.books.find_one({"id": book_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    try:
        cover = await ai_service.generate_cover(
            title=doc.get("titolo") or doc.get("idea", "Libro"),
            genere=doc.get("genere", ""),
            sinossi=doc.get("sinossi", "") or doc.get("idea", ""),
            model=payload.model,
            style=payload.style,
        )
    except Exception as e:
        logger.error(f"Generazione copertina fallita: {e}")
        raise HTTPException(status_code=500, detail=f"Copertina fallita: {str(e)}")

    await db.books.update_one(
        {"id": book_id},
        {"$set": {"cover_image": cover, "cover_model": payload.model}},
    )
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
