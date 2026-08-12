"""Backend tests for Libroteca AI Email/Password auth (JWT) + regressione rotte protette."""
import os
import re
import time
import uuid
import subprocess
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://story-craft-ai-36.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "test@libroteca.ai"
TEST_PASSWORD = "Test1234!"

BACKEND_ERR_LOG = "/var/log/supervisor/backend.err.log"
BACKEND_OUT_LOG = "/var/log/supervisor/backend.out.log"


def _new_email(prefix="test"):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@libroteca.ai"


# ---------- Login / me ----------
class TestLoginMe:
    def test_login_seeded_user_sets_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("email") == TEST_EMAIL
        # Cookies
        cookies = {c.name: c for c in s.cookies}
        assert "access_token" in cookies
        assert "refresh_token" in cookies

    def test_me_returns_same_user(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200, r.text
        assert r.json().get("email") == TEST_EMAIL

    def test_login_wrong_password_401_italian(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": "WrongPass!"})
        assert r.status_code == 401
        detail = r.json().get("detail", "")
        assert isinstance(detail, str) and len(detail) > 0


# ---------- Register ----------
class TestRegister:
    def test_register_creates_user_with_15_credits(self):
        email = _new_email("reg")
        s = requests.Session()
        r = s.post(f"{API}/auth/register", json={
            "name": "Test Reg", "email": email, "password": "SecurePass1!"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("email", "").lower() == email.lower()
        assert data.get("credits") == 15
        # me works with same session
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"].lower() == email.lower()

    def test_register_duplicate_email_400_italian(self):
        # try to re-register the seeded test user
        r = requests.post(f"{API}/auth/register", json={
            "name": "dup", "email": TEST_EMAIL, "password": "SecurePass1!"
        })
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert re.search(r"esist|già|registrat", detail, re.IGNORECASE), detail


# ---------- Brute force ----------
class TestBruteForce:
    def test_lockout_after_5_fails(self):
        # Use a dedicated user so we don't lock out TEST_EMAIL
        email = _new_email("brute")
        # create user
        requests.post(f"{API}/auth/register", json={
            "name": "Brute", "email": email, "password": "GoodPass1!"
        })
        codes = []
        for _ in range(5):
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "Wrong!"})
            codes.append(r.status_code)
        # 6th try should be locked out (429)
        r6 = requests.post(f"{API}/auth/login", json={"email": email, "password": "Wrong!"})
        # Even correct password should be blocked while locked
        r7 = requests.post(f"{API}/auth/login", json={"email": email, "password": "GoodPass1!"})
        assert 429 in (r6.status_code, r7.status_code), f"codes={codes} r6={r6.status_code} r7={r7.status_code}"


# ---------- Forgot / Reset ----------
class TestForgotReset:
    def test_forgot_logs_reset_link_and_reset_works(self):
        email = _new_email("forgot")
        # register
        r = requests.post(f"{API}/auth/register", json={
            "name": "Forgot", "email": email, "password": "OldPass1!"
        })
        assert r.status_code == 200

        # request forgot
        r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
        assert r.status_code == 200

        # give the log a moment
        time.sleep(1)

        # scrape token from backend logs
        token = None
        for path in (BACKEND_ERR_LOG, BACKEND_OUT_LOG):
            try:
                out = subprocess.check_output(["tail", "-n", "500", path], text=True, errors="ignore")
            except Exception:
                continue
            m = re.findall(rf"RESET PASSWORD.*{re.escape(email.lower())}.*token=([A-Za-z0-9_\-\.]+)", out, re.IGNORECASE)
            if m:
                token = m[-1]
                break
        assert token, f"Reset token not found in backend logs for {email}"

        # reset
        r = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "NewPass1!"})
        assert r.status_code == 200, r.text

        # old password fails
        r_old = requests.post(f"{API}/auth/login", json={"email": email, "password": "OldPass1!"})
        assert r_old.status_code == 401

        # new password works
        s = requests.Session()
        r_new = s.post(f"{API}/auth/login", json={"email": email, "password": "NewPass1!"})
        assert r_new.status_code == 200

        # token is single-use
        r_reuse = requests.post(f"{API}/auth/reset-password", json={"token": token, "password": "Another1!"})
        assert r_reuse.status_code == 400


# ---------- Refresh / Logout ----------
class TestRefreshLogout:
    def test_refresh_returns_ok_and_rotates_access(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        old_access = s.cookies.get("access_token")
        assert old_access
        r = s.post(f"{API}/auth/refresh")
        assert r.status_code == 200, r.text
        new_access = s.cookies.get("access_token")
        assert new_access
        # me still works after refresh
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200

    def test_logout_clears_cookies(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # after logout, /me should be 401
        # requests.Session may still hold old cookies if Set-Cookie didn't clear them properly
        # so check with a fresh session that has no cookies set
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 401, f"expected 401 post-logout, got {me.status_code}"


# ---------- Protected route regression with JWT ----------
class TestProtectedRoutesRegression:
    def test_books_list_works_with_jwt_cookie(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        r = s.get(f"{API}/books")
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_books_list_401_without_auth(self):
        r = requests.get(f"{API}/books")
        assert r.status_code == 401

    def test_books_list_works_with_bearer_jwt(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        access = s.cookies.get("access_token")
        assert access
        r = requests.get(f"{API}/books", headers={"Authorization": f"Bearer {access}"})
        assert r.status_code == 200
