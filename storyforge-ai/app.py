import os
import re
import json
import base64
from io import BytesIO
from pathlib import Path
from datetime import datetime
from functools import wraps

from flask import Flask, request, jsonify, session, send_file
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont
from openai import OpenAI

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", BASE_DIR / "data" / "generated"))
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

app = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = os.getenv("SECRET_KEY", "development-only")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///storyforge.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) if os.getenv("OPENAI_API_KEY") else None
TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-6-luna")
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2.5-sunburst")


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    credits = db.Column(db.Integer, nullable=False, default=100)
    plan = db.Column(db.String(40), nullable=False, default="free")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    project_type = db.Column(db.String(20), nullable=False, default="single")
    genre = db.Column(db.String(100), nullable=False, default="Fantasy")
    tone = db.Column(db.String(255), default="")
    audience = db.Column(db.String(255), default="")
    language = db.Column(db.String(80), default="Italiano")
    premise = db.Column(db.Text, default="")
    style_notes = db.Column(db.Text, default="")
    chapter_count = db.Column(db.Integer, default=8)
    words_per_chapter = db.Column(db.Integer, default=1200)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Character(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(255), default="")
    age = db.Column(db.String(80), default="")
    appearance = db.Column(db.Text, default="")
    personality = db.Column(db.Text, default="")
    goal = db.Column(db.Text, default="")
    fear = db.Column(db.Text, default="")
    backstory = db.Column(db.Text, default="")
    powers = db.Column(db.Text, default="")
    relationships = db.Column(db.Text, default="")
    image_path = db.Column(db.String(500), default="")


class Volume(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False, index=True)
    position = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    subtitle = db.Column(db.String(255), default="")
    synopsis = db.Column(db.Text, default="")
    arc = db.Column(db.Text, default="")
    cover_path = db.Column(db.String(500), default="")


class Chapter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    volume_id = db.Column(db.Integer, db.ForeignKey("volume.id"), nullable=False, index=True)
    position = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    synopsis = db.Column(db.Text, default="")
    content = db.Column(db.Text, default="")


with app.app_context():
    db.create_all()


def auth_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify(error="Autenticazione richiesta."), 401
        return fn(*args, **kwargs)
    return wrapped


def project_owned(project_id):
    return Project.query.filter_by(id=project_id, user_id=session["user_id"]).first()


def serialize_project(p):
    chars = Character.query.filter_by(project_id=p.id).order_by(Character.id).all()
    vols = Volume.query.filter_by(project_id=p.id).order_by(Volume.position).all()
    return {
        "id": p.id, "title": p.title, "project_type": p.project_type, "genre": p.genre,
        "tone": p.tone, "audience": p.audience, "language": p.language,
        "premise": p.premise, "style_notes": p.style_notes,
        "chapter_count": p.chapter_count, "words_per_chapter": p.words_per_chapter,
        "characters": [{
            "id": c.id, "name": c.name, "role": c.role, "age": c.age,
            "appearance": c.appearance, "personality": c.personality, "goal": c.goal,
            "fear": c.fear, "backstory": c.backstory, "powers": c.powers,
            "relationships": c.relationships, "image_path": c.image_path
        } for c in chars],
        "volumes": [{
            "id": v.id, "position": v.position, "title": v.title, "subtitle": v.subtitle,
            "synopsis": v.synopsis, "arc": v.arc, "cover_path": v.cover_path,
            "chapters": [{
                "id": ch.id, "position": ch.position, "title": ch.title,
                "synopsis": ch.synopsis, "content": ch.content
            } for ch in Chapter.query.filter_by(volume_id=v.id).order_by(Chapter.position).all()]
        } for v in vols]
    }


def project_context(p):
    data = serialize_project(p)
    cast = "\n".join(
        f"- {c['name']} | {c['role']} | {c['appearance']} | {c['personality']} | obiettivo: {c['goal']} | paura: {c['fear']} | passato: {c['backstory']} | poteri: {c['powers']} | relazioni: {c['relationships']}"
        for c in data["characters"]
    )
    return f"""Titolo: {p.title}
Formato: {'trilogia' if p.project_type == 'trilogy' else 'libro singolo'}
Genere: {p.genre}
Tono: {p.tone}
Pubblico: {p.audience}
Lingua: {p.language}
Premessa: {p.premise}
Stile: {p.style_notes}
Personaggi:
{cast or '- da definire'}"""


def ai_text(prompt):
    if not client:
        raise RuntimeError("Configura il provider AI nel server.")
    r = client.responses.create(model=TEXT_MODEL, input=prompt)
    return r.output_text.strip()


def ai_json(prompt):
    raw = ai_text(prompt)
    raw = re.sub(r"^\`\`\`(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*\`\`\`$", "", raw)
    start, end = raw.find("{"), raw.rfind("}")
    return json.loads(raw[start:end+1])


@app.get("/")
def index():
    return send_file(BASE_DIR / "index.html")


@app.get("/api/health")
def health():
    return jsonify(ok=True, ai_configured=bool(client), text_model=TEXT_MODEL, image_model=IMAGE_MODEL)


@app.get("/api/me")
def me():
    user = db.session.get(User, session.get("user_id")) if session.get("user_id") else None
    return jsonify(user=None if not user else {"id": user.id, "email": user.email, "credits": user.credits, "plan": user.plan})


@app.post("/api/register")
def register():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify(error="Email non valida."), 400
    if len(password) < 8:
        return jsonify(error="Password troppo corta."), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error="Account già esistente."), 409
    u = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(u); db.session.commit()
    session["user_id"] = u.id
    return jsonify(ok=True, user={"id": u.id, "email": u.email, "credits": u.credits, "plan": u.plan})


@app.post("/api/login")
def login():
    data = request.get_json() or {}
    u = User.query.filter_by(email=data.get("email", "").strip().lower()).first()
    if not u or not check_password_hash(u.password_hash, data.get("password", "")):
        return jsonify(error="Credenziali non valide."), 401
    session["user_id"] = u.id
    return jsonify(ok=True, user={"id": u.id, "email": u.email, "credits": u.credits, "plan": u.plan})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@app.get("/api/projects")
@auth_required
def projects():
    rows = Project.query.filter_by(user_id=session["user_id"]).order_by(Project.updated_at.desc()).all()
    return jsonify(projects=[{"id": p.id, "title": p.title, "project_type": p.project_type, "genre": p.genre} for p in rows])


@app.post("/api/projects")
@auth_required
def create_project():
    d = request.get_json() or {}
    p = Project(
        user_id=session["user_id"], title=d.get("title", "").strip() or "Nuovo libro",
        project_type=d.get("project_type", "single"), genre=d.get("genre", "Fantasy"),
        premise=d.get("premise", ""), chapter_count=max(4, min(int(d.get("chapter_count", 8)), 30)),
        words_per_chapter=max(700, min(int(d.get("words_per_chapter", 1200)), 3500))
    )
    db.session.add(p); db.session.commit()
    return jsonify(ok=True, project=serialize_project(p))


@app.get("/api/projects/<int:project_id>")
@auth_required
def get_project(project_id):
    p = project_owned(project_id)
    return (jsonify(project=serialize_project(p)) if p else (jsonify(error="Progetto non trovato."), 404))


@app.put("/api/projects/<int:project_id>")
@auth_required
def update_project(project_id):
    p = project_owned(project_id)
    if not p: return jsonify(error="Progetto non trovato."), 404
    d = request.get_json() or {}
    for field in ["title","genre","tone","audience","language","premise","style_notes","chapter_count","words_per_chapter"]:
        if field in d: setattr(p, field, d[field])
    db.session.commit()
    return jsonify(ok=True, project=serialize_project(p))


@app.delete("/api/projects/<int:project_id>")
@auth_required
def delete_project(project_id):
    p = project_owned(project_id)
    if not p: return jsonify(error="Progetto non trovato."), 404
    for v in Volume.query.filter_by(project_id=p.id).all():
        Chapter.query.filter_by(volume_id=v.id).delete()
        db.session.delete(v)
    Character.query.filter_by(project_id=p.id).delete()
    db.session.delete(p); db.session.commit()
    return jsonify(ok=True)


@app.post("/api/projects/<int:project_id>/characters")
@auth_required
def add_character(project_id):
    p = project_owned(project_id)
    if not p: return jsonify(error="Progetto non trovato."), 404
    d = request.get_json() or {}
    c = Character(project_id=p.id, **{k:d.get(k,"") for k in ["name","role","age","appearance","personality","goal","fear","backstory","powers","relationships"]})
    db.session.add(c); db.session.commit()
    return jsonify(ok=True, project=serialize_project(p))


@app.delete("/api/projects/<int:project_id>/characters/<int:char_id>")
@auth_required
def delete_character(project_id, char_id):
    p = project_owned(project_id)
    if not p: return jsonify(error="Progetto non trovato."), 404
    Character.query.filter_by(id=char_id, project_id=p.id).delete(); db.session.commit()
    return jsonify(ok=True)


@app.post("/api/projects/<int:project_id>/generate-plan")
@auth_required
def generate_plan(project_id):
    p = project_owned(project_id)
    if not p: return jsonify(error="Progetto non trovato."), 404
    count = 3 if p.project_type == "trilogy" else 1
    prompt = f"""Sei un editor narrativo. Progetta una storia originale e coerente.
{project_context(p)}
Crea esattamente {count} volumi e {p.chapter_count} capitoli per volume.
Restituisci SOLO JSON: {{"volumes":[{{"title":"","subtitle":"","synopsis":"","arc":"","chapters":[{{"title":"","synopsis":""}}]}}]}}"""
    try:
        data = ai_json(prompt)
        for v in Volume.query.filter_by(project_id=p.id).all():
            Chapter.query.filter_by(volume_id=v.id).delete()
            db.session.delete(v)
        db.session.flush()
        for i, item in enumerate(data["volumes"], 1):
            v = Volume(project_id=p.id, position=i, title=item.get("title",f"Volume {i}"), subtitle=item.get("subtitle",""), synopsis=item.get("synopsis",""), arc=item.get("arc",""))
            db.session.add(v); db.session.flush()
            for j, ch in enumerate(item.get("chapters", []), 1):
                db.session.add(Chapter(volume_id=v.id, position=j, title=ch.get("title",f"Capitolo {j}"), synopsis=ch.get("synopsis","")))
        db.session.commit()
        return jsonify(ok=True, project=serialize_project(p))
    except Exception as e:
        db.session.rollback()
        return jsonify(error=str(e)), 500


@app.post("/api/projects/<int:project_id>/generate-next-chapter")
@auth_required
def generate_next(project_id):
    p = project_owned(project_id)
    if not p: return jsonify(error="Progetto non trovato."), 404
    for v in Volume.query.filter_by(project_id=p.id).order_by(Volume.position).all():
        ch = Chapter.query.filter_by(volume_id=v.id, content="").order_by(Chapter.position).first()
        if ch:
            previous = Chapter.query.filter(Chapter.volume_id==v.id, Chapter.position<ch.position).order_by(Chapter.position).all()
            continuity = "\n".join(f"{x.position}. {x.title}: {x.synopsis}" for x in previous)
            prompt = f"""Scrivi il capitolo completo in {p.language}.
{project_context(p)}
Volume: {v.title}
Capitolo: {ch.title}
Obiettivo: {ch.synopsis}
Continuità: {continuity}
Circa {p.words_per_chapter} parole. Solo prosa narrativa, niente note."""
            try:
                ch.content = ai_text(prompt); db.session.commit()
                return jsonify(ok=True, done=False, project=serialize_project(p))
            except Exception as e:
                db.session.rollback(); return jsonify(error=str(e)), 500
    return jsonify(ok=True, done=True, project=serialize_project(p))


@app.put("/api/projects/<int:project_id>/chapters/<int:chapter_id>")
@auth_required
def save_chapter(project_id, chapter_id):
    p = project_owned(project_id)
    if not p: return jsonify(error="Progetto non trovato."), 404
    ch = Chapter.query.join(Volume).filter(Chapter.id==chapter_id, Volume.project_id==p.id).first()
    if not ch: return jsonify(error="Capitolo non trovato."), 404
    d = request.get_json() or {}
    ch.title = d.get("title", ch.title); ch.synopsis = d.get("synopsis", ch.synopsis); ch.content = d.get("content", ch.content)
    db.session.commit()
    return jsonify(ok=True, project=serialize_project(p))


@app.get("/api/projects/<int:project_id>/export")
@auth_required
def export_project(project_id):
    p = project_owned(project_id)
    if not p: return jsonify(error="Progetto non trovato."), 404
    data = serialize_project(p)
    out = [f"# {p.title}", ""]
    for v in data["volumes"]:
        out += [f"# Volume {v['position']} — {v['title']}", "", v["synopsis"], ""]
        for ch in v["chapters"]:
            out += [f"## Capitolo {ch['position']} — {ch['title']}", "", ch["content"], ""]
    bio = BytesIO("\n".join(out).encode("utf-8"))
    return send_file(bio, as_attachment=True, download_name="storyforge-book.md", mimetype="text/markdown")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_ENV")=="development")
