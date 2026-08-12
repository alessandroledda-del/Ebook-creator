"""Tests for series shelf endpoint and coordinated cover error path.
Does NOT trigger paid AI generation for the happy path (already verified by main agent).
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EMAIL = "test@libroteca.ai"
PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return s


def test_books_list_exposes_serie_root_id(session):
    r = session.get(f"{BASE_URL}/api/books")
    assert r.status_code == 200
    books = r.json()
    by_id = {b["id"]: b for b in books}
    assert "book_parent_test01" in by_id, "seed parent missing"
    assert "book_341e3efcc848" in by_id, "seed sequel missing"

    parent = by_id["book_parent_test01"]
    sequel = by_id["book_341e3efcc848"]

    # Volume 1 -> serie_root_id empty/None/absent
    assert not parent.get("serie_root_id"), f"expected empty for vol.1, got {parent.get('serie_root_id')!r}"
    # Sequel -> serie_root_id == parent id
    assert sequel.get("serie_root_id") == "book_parent_test01", sequel.get("serie_root_id")
    assert sequel.get("serie_volume", 1) >= 2


def test_use_parent_cover_on_non_series_returns_400(session):
    # First create a fresh standalone book (not a sequel) to safely test the error path
    payload = {
        "idea": "TEST_ un breve racconto sul silenzio dopo la neve",
        "genere": "Contemporaneo",
        "tono": "poetico",
        "lunghezza_target": "breve",
        "pov": "prima persona",
    }
    cr = session.post(f"{BASE_URL}/api/books", json=payload)
    assert cr.status_code in (200, 201), cr.text
    book_id = cr.json()["id"]

    try:
        r = session.post(
            f"{BASE_URL}/api/books/{book_id}/cover",
            json={"use_parent_cover": True, "model": "gemini-nano-banana", "stile": "test"},
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code} body={r.text}"
        body = r.json()
        detail = body.get("detail") or body.get("message") or ""
        assert "serie" in detail.lower(), f"unexpected detail: {detail!r}"
    finally:
        session.delete(f"{BASE_URL}/api/books/{book_id}")
