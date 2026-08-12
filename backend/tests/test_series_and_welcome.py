"""Backend tests for the Book Series/Sequel and Welcome Email features.

Covers:
- POST /api/books with valid parent_book_id (inherits characters, sets serie_volume, parent_titolo, contesto_serie)
- POST /api/books with invalid parent_book_id -> 404
- GET /api/books summary exposes serie_volume and parent_titolo
- POST /api/auth/register triggers welcome email (log line appears in backend log)
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://story-craft-ai-36.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEED_EMAIL = "test@libroteca.ai"
SEED_PWD = "Test1234!"
PARENT_ID = "book_parent_test01"
SEQUEL_ID = "book_341e3efcc848"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PWD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return s


# ---- Series / Sequel ----

class TestSeriesSequel:
    def test_list_books_exposes_serie_fields(self, session):
        r = session.get(f"{API}/books", timeout=15)
        assert r.status_code == 200
        books = r.json()
        assert isinstance(books, list) and len(books) > 0
        # each book must have serie_volume and parent_titolo keys
        for b in books:
            assert "serie_volume" in b
            assert "parent_titolo" in b
        # verify the known sequel book carries Vol.2 + parent title
        sequel = next((b for b in books if b["id"] == SEQUEL_ID), None)
        assert sequel is not None, "sequel seed book missing"
        assert sequel["serie_volume"] == 2
        assert sequel["parent_titolo"] == "Gli Orologi del Tempo Sospeso"
        # parent must still be Vol.1
        parent = next((b for b in books if b["id"] == PARENT_ID), None)
        assert parent is not None, "parent seed book missing"
        assert (parent.get("serie_volume") or 1) == 1

    def test_create_book_with_invalid_parent_returns_404(self, session):
        r = session.post(
            f"{API}/books",
            json={
                "idea": "TEST_ sequel from nonexistent parent (must fail)",
                "genere": "narrativa",
                "model": "claude-sonnet-4-5-20250929",
                "num_capitoli": 3,
                "characters": [],
                "parent_book_id": "book_does_not_exist_xxx",
            },
            timeout=15,
        )
        assert r.status_code == 404

    def test_create_book_with_valid_parent_inherits_context(self, session):
        # Fetch parent for expected fields
        pr = session.get(f"{API}/books/{PARENT_ID}", timeout=15)
        assert pr.status_code == 200
        parent = pr.json()
        parent_chars = parent.get("characters", [])
        assert len(parent_chars) >= 1, "parent should have characters"

        payload = {
            "idea": f"TEST_sequel_{uuid.uuid4().hex[:6]} continuazione della vicenda del vol.1",
            "genere": parent.get("genere") or "narrativa",
            "model": "claude-sonnet-4-5-20250929",
            "num_capitoli": 3,
            "characters": [],  # empty -> should inherit from parent
            "parent_book_id": PARENT_ID,
        }
        r = session.post(f"{API}/books", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        book = r.json()
        book_id = book["id"]

        try:
            assert book.get("parent_book_id") == PARENT_ID
            assert book.get("parent_titolo") == parent.get("titolo", "")
            assert book.get("serie_volume") == 2
            ctx = book.get("contesto_serie", "")
            assert "TITOLO DEL VOLUME PRECEDENTE" in ctx
            assert parent.get("titolo", "") in ctx
            assert len(ctx) > 200
            # characters inherited
            assert len(book.get("characters", [])) == len(parent_chars)
            names_new = {c["nome"] for c in book["characters"]}
            names_parent = {c["nome"] for c in parent_chars}
            assert names_new == names_parent

            # GET verification
            g = session.get(f"{API}/books/{book_id}", timeout=15)
            assert g.status_code == 200
            g_book = g.json()
            assert g_book["serie_volume"] == 2
            assert g_book["parent_titolo"] == parent.get("titolo", "")

            # summary listing shows the new book with Vol.2 badge fields
            lst = session.get(f"{API}/books", timeout=15).json()
            new_summary = next((b for b in lst if b["id"] == book_id), None)
            assert new_summary is not None
            assert new_summary["serie_volume"] == 2
            assert new_summary["parent_titolo"] == parent.get("titolo", "")
        finally:
            session.delete(f"{API}/books/{book_id}", timeout=10)


# ---- Welcome email trigger ----

BACKEND_LOG = "/var/log/supervisor/backend.err.log"


class TestWelcomeEmail:
    def test_register_triggers_welcome_email_log(self):
        s = requests.Session()
        email = f"test_welcome_{uuid.uuid4().hex[:8]}@libroteca.ai"
        r = s.post(
            f"{API}/auth/register",
            json={"name": "Welcome Test", "email": email, "password": "Passw0rd!"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        user = r.json()
        assert user["email"] == email
        assert user.get("credits") == 15  # welcome credits

        # allow background asyncio task to run
        time.sleep(3)
        try:
            with open(BACKEND_LOG, "r", encoding="utf-8", errors="ignore") as f:
                # tail last ~200KB
                f.seek(0, 2)
                size = f.tell()
                f.seek(max(0, size - 200_000))
                tail = f.read().lower()
        except FileNotFoundError:
            pytest.skip("backend log not available")

        # Either success ("email di benvenuto inviata") or expected Resend testing-mode
        # failure ("invio email di benvenuto fallito") should mention this email.
        assert email.lower() in tail, "welcome email trigger not logged for new user"
