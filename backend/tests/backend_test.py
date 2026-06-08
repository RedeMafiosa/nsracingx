"""NsRacing backend API tests."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://racing-tokens-arena.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "jsuispasportugues@gmail.com"
ADMIN_PASSWORD = "merlin010"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def user_data(session):
    """Create a test user once for the session."""
    suffix = uuid.uuid4().hex[:8]
    nick = f"TEST_user_{suffix}"
    email = f"test_{suffix}@example.com"
    password = "Pass1234!"
    r = session.post(f"{API}/auth/register", json={"nick": nick, "email": email, "password": password})
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    body = r.json()
    return {"token": body["token"], "user": body["user"], "nick": nick, "email": email, "password": password}


@pytest.fixture(scope="session")
def user2_data(session):
    suffix = uuid.uuid4().hex[:8]
    nick = f"TEST_user2_{suffix}"
    email = f"test2_{suffix}@example.com"
    password = "Pass1234!"
    r = session.post(f"{API}/auth/register", json={"nick": nick, "email": email, "password": password})
    assert r.status_code == 200
    body = r.json()
    return {"token": body["token"], "user": body["user"], "nick": nick}


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ===== Stats =====
class TestStats:
    def test_stats_shape(self, session):
        r = session.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        assert "registered" in d and isinstance(d["registered"], int)
        assert "online" in d and isinstance(d["online"], int)
        assert "top10_hours" in d and isinstance(d["top10_hours"], list)


# ===== Auth =====
class TestAuth:
    def test_register_returns_token_and_user(self, user_data):
        u = user_data["user"]
        assert user_data["token"]
        assert u["tokens"] == 10
        assert "Rookie" in u["tags"]
        assert u["is_admin"] is False
        assert u["nick"] == user_data["nick"]

    def test_register_duplicate_email(self, session, user_data):
        r = session.post(f"{API}/auth/register", json={"nick": "OtherNick_" + uuid.uuid4().hex[:5], "email": user_data["email"], "password": "x"})
        assert r.status_code == 400

    def test_login_admin(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["is_admin"] is True
        assert d["token"]

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, session, user_data):
        r = session.get(f"{API}/auth/me", headers=auth_header(user_data["token"]))
        assert r.status_code == 200
        assert r.json()["nick"] == user_data["nick"]

    def test_me_unauth(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_forgot_unknown_email(self, session):
        r = session.post(f"{API}/auth/forgot", json={"email": f"noexist_{uuid.uuid4().hex[:6]}@x.com"})
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_forgot_existing_email(self, session, user_data):
        r = session.post(f"{API}/auth/forgot", json={"email": user_data["email"]})
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ===== Lives =====
class TestLives:
    def test_list_lives_default(self, session):
        r = session.get(f"{API}/lives")
        assert r.status_code == 200
        lives = r.json()
        assert len(lives) >= 15

    def test_view_increment_and_top(self, session):
        r = session.get(f"{API}/lives")
        lives = r.json()
        target = lives[0]
        before = target.get("views", 0)
        rv = session.post(f"{API}/lives/{target['id']}/view")
        assert rv.status_code == 200
        # verify
        r2 = session.get(f"{API}/lives")
        updated = next(l for l in r2.json() if l["id"] == target["id"])
        assert updated["views"] == before + 1

    def test_tops_sorted_desc(self, session):
        r = session.get(f"{API}/tops")
        assert r.status_code == 200
        tops = r.json()
        views = [l.get("views", 0) for l in tops]
        assert views == sorted(views, reverse=True)


# ===== Packages & Tokens =====
class TestTokens:
    def test_packages(self, session):
        r = session.get(f"{API}/packages")
        assert r.status_code == 200
        pkgs = r.json()
        assert len(pkgs) == 6
        assert all("tokens" in p and "price" in p and "id" in p for p in pkgs)

    def test_purchase(self, session, user_data):
        token = user_data["token"]
        pkgs = session.get(f"{API}/packages").json()
        pkg = pkgs[0]
        # current balance
        me_before = session.get(f"{API}/auth/me", headers=auth_header(token)).json()
        before_tokens = me_before["tokens"]
        r = session.post(f"{API}/tokens/purchase", json={"package_id": pkg["id"]}, headers=auth_header(token))
        assert r.status_code == 200
        d = r.json()
        assert d["tokens_added"] == pkg["tokens"]
        me_after = session.get(f"{API}/auth/me", headers=auth_header(token)).json()
        assert me_after["tokens"] == before_tokens + pkg["tokens"]
        if pkg.get("auto_tag"):
            assert pkg["auto_tag"] in me_after["tags"]

    def test_send_tokens(self, session, user_data, user2_data):
        token = user_data["token"]
        amount = 5
        me_before = session.get(f"{API}/auth/me", headers=auth_header(token)).json()
        r = session.post(f"{API}/tokens/send", json={"nick": user2_data["nick"], "amount": amount}, headers=auth_header(token))
        assert r.status_code == 200, r.text
        me_after = session.get(f"{API}/auth/me", headers=auth_header(token)).json()
        assert me_after["tokens"] == me_before["tokens"] - amount
        # receiver
        r2 = session.get(f"{API}/auth/me", headers=auth_header(user2_data["token"]))
        assert r2.json()["tokens"] >= 10 + amount

    def test_send_tokens_unknown_nick(self, session, user_data):
        r = session.post(f"{API}/tokens/send", json={"nick": "NoSuchUser_xyz_1234", "amount": 1}, headers=auth_header(user_data["token"]))
        assert r.status_code == 404

    def test_claim_free_first_and_429(self, session, user2_data):
        token = user2_data["token"]
        r1 = session.post(f"{API}/tokens/claim-free", headers=auth_header(token))
        assert r1.status_code == 200
        assert r1.json()["tokens_added"] == 2
        r2 = session.post(f"{API}/tokens/claim-free", headers=auth_header(token))
        assert r2.status_code == 429

    def test_next_claim(self, session, user2_data):
        r = session.get(f"{API}/tokens/next-claim", headers=auth_header(user2_data["token"]))
        assert r.status_code == 200
        d = r.json()
        assert "ready" in d and "seconds_remaining" in d


# ===== Tags / Ranks =====
class TestTagsRanks:
    def test_tags_default20(self, session):
        r = session.get(f"{API}/tags")
        assert r.status_code == 200
        tags = r.json()
        assert len(tags) >= 20
        tiers = [t["tier"] for t in tags]
        assert tiers == sorted(tiers)

    def test_ranks(self, session):
        r = session.get(f"{API}/ranks")
        assert r.status_code == 200
        d = r.json()
        assert "by_rank" in d and "top_hours" in d
        assert isinstance(d["by_rank"], list)
        assert isinstance(d["top_hours"], list)


# ===== Profile =====
class TestProfile:
    def test_update_profile(self, session, user_data):
        token = user_data["token"]
        body = {"bio": "test bio", "avatar_url": "https://x.com/a.png", "cover_url": "https://x.com/c.png", "name_color": "#00FF00"}
        r = session.put(f"{API}/profile", json=body, headers=auth_header(token))
        assert r.status_code == 200
        u = r.json()
        assert u["bio"] == "test bio"
        assert u["name_color"] == "#00FF00"
        # persistence
        me = session.get(f"{API}/auth/me", headers=auth_header(token)).json()
        assert me["bio"] == "test bio"


# ===== Admin =====
class TestAdmin:
    def test_admin_users_requires_admin(self, session, user_data):
        r = session.get(f"{API}/admin/users", headers=auth_header(user_data["token"]))
        assert r.status_code == 403

    def test_admin_users(self, session, admin_token):
        r = session.get(f"{API}/admin/users", headers=auth_header(admin_token))
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert len(users) >= 1

    def test_ban_unban(self, session, admin_token, user2_data):
        uid = user2_data["user"]["id"]
        r = session.post(f"{API}/admin/ban", json={"user_id": uid}, headers=auth_header(admin_token))
        assert r.status_code == 200
        # banned login should fail with 403 (or me with 403)
        r_me = session.get(f"{API}/auth/me", headers=auth_header(user2_data["token"]))
        assert r_me.status_code == 403
        # unban
        ru = session.post(f"{API}/admin/unban", json={"user_id": uid}, headers=auth_header(admin_token))
        assert ru.status_code == 200
        r_me2 = session.get(f"{API}/auth/me", headers=auth_header(user2_data["token"]))
        assert r_me2.status_code == 200

    def test_assign_tag(self, session, admin_token, user_data):
        uid = user_data["user"]["id"]
        tags = session.get(f"{API}/tags").json()
        tag = next(t for t in tags if t["name"] == "VIP")
        r = session.post(f"{API}/admin/assign-tag", json={"user_id": uid, "tag_id": tag["id"]}, headers=auth_header(admin_token))
        assert r.status_code == 200
        me = session.get(f"{API}/auth/me", headers=auth_header(user_data["token"])).json()
        assert "VIP" in me["tags"]


# ===== Chat history =====
class TestChat:
    def test_chat_history(self, session):
        r = session.get(f"{API}/chat/history")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ===== WebSocket =====
class TestWebSocket:
    def test_ws_connect_and_send(self, user_data):
        try:
            import websocket  # type: ignore
        except ImportError:
            pytest.skip("websocket-client not installed")
        ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + f"/api/ws/chat?token={user_data['token']}"
        ws = websocket.create_connection(ws_url, timeout=10)
        try:
            # first message should be history
            import json as _json
            first = _json.loads(ws.recv())
            assert first.get("type") == "history"
            # send a message
            ws.send(_json.dumps({"text": f"hello {uuid.uuid4().hex[:5]}"}))
            # may receive presence first, look for message
            got_message = False
            for _ in range(5):
                try:
                    ws.settimeout(5)
                    raw = ws.recv()
                    msg = _json.loads(raw)
                    if msg.get("type") == "message":
                        got_message = True
                        break
                except Exception:
                    break
            assert got_message
        finally:
            ws.close()
