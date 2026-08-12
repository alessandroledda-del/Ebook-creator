"""Backend tests for Libroteca profile features (iteration_2).

Auth: JWT httpOnly cookies. We use requests.Session which stores cookies automatically.
"""
import os
import time
import uuid
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://story-craft-ai-36.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEED_EMAIL = "test@libroteca.ai"
SEED_PASS = "Test1234!"


def _register_throwaway():
    s = requests.Session()
    email = f"test_prof_{uuid.uuid4().hex[:10]}@libroteca.ai"
    password = "Pwd12345!"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": password, "name": "Prof Test"})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    assert "access_token" in s.cookies, f"no cookies: {dict(s.cookies)}"
    return email, password, s


def _login_session(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return s


# ---------- GET /auth/account ----------
def test_account_info_seed_user():
    s = _login_session(SEED_EMAIL, SEED_PASS)
    r = s.get(f"{API}/auth/account")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == SEED_EMAIL
    assert data["has_password"] is True
    assert data["auth_provider"] in ("email", "google")
    assert isinstance(data["credits"], int)
    assert "name" in data


def test_account_info_unauthenticated():
    r = requests.get(f"{API}/auth/account")
    assert r.status_code in (401, 403)


# ---------- POST /auth/change-password ----------
def test_change_password_wrong_current():
    email, password, s = _register_throwaway()
    r = s.post(f"{API}/auth/change-password", json={"current_password": "WrongPass!", "new_password": "NewPass123!"})
    assert r.status_code == 400, r.text
    detail = r.json().get("detail", "").lower()
    assert "attuale" in detail or "corretta" in detail, f"expected italian error, got: {detail}"


def test_change_password_success_and_login():
    email, password, s = _register_throwaway()
    new_pass = "Changed456!"
    r = s.post(f"{API}/auth/change-password", json={"current_password": password, "new_password": new_pass})
    assert r.status_code == 200, r.text
    # new pass works
    lr = requests.post(f"{API}/auth/login", json={"email": email, "password": new_pass})
    assert lr.status_code == 200, lr.text
    # old pass fails
    lr2 = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert lr2.status_code in (400, 401)


def test_change_password_too_short():
    email, password, s = _register_throwaway()
    r = s.post(f"{API}/auth/change-password", json={"current_password": password, "new_password": "abc"})
    assert r.status_code == 400
    assert "6" in r.json().get("detail", "")


# ---------- POST /auth/change-email ----------
def test_change_email_wrong_password():
    email, password, s = _register_throwaway()
    r = s.post(f"{API}/auth/change-email", json={"new_email": f"o_{uuid.uuid4().hex[:6]}@example.com", "password": "WRONG!"})
    assert r.status_code == 400
    assert "password" in r.json().get("detail", "").lower()


def test_change_email_duplicate():
    email, password, s = _register_throwaway()
    r = s.post(f"{API}/auth/change-email", json={"new_email": SEED_EMAIL, "password": password})
    assert r.status_code == 400
    d = r.json().get("detail", "").lower()
    assert "già" in d or "gia" in d or "usa" in d


def test_change_email_success_and_login():
    email, password, s = _register_throwaway()
    new_email = f"changed_{uuid.uuid4().hex[:10]}@libroteca.ai"
    r = s.post(f"{API}/auth/change-email", json={"new_email": new_email, "password": password})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == new_email
    lr = requests.post(f"{API}/auth/login", json={"email": new_email, "password": password})
    assert lr.status_code == 200
    lr2 = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert lr2.status_code in (400, 401)


# ---------- POST /auth/forgot-password ----------
def test_forgot_password_registered_email():
    email, password, _s = _register_throwaway()
    r = requests.post(f"{API}/auth/forgot-password", json={"email": email}, headers={"Origin": BASE_URL})
    assert r.status_code == 200
    body = r.json()
    assert "email" in body.get("message", "").lower() or "riceverai" in body.get("message", "").lower()
    time.sleep(0.5)
    try:
        with open("/var/log/supervisor/backend.err.log", "r") as f:
            log = f.read()[-10000:]
        assert email in log or "RESET PASSWORD" in log
    except FileNotFoundError:
        pass


def test_forgot_password_unknown_email_returns_generic():
    r = requests.post(f"{API}/auth/forgot-password", json={"email": f"nonexistent_{uuid.uuid4().hex}@x.com"})
    assert r.status_code == 200
    assert "message" in r.json()
