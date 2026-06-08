"""NsRacing backend - racing community platform."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, WebSocket, WebSocketDisconnect, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Set
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os
import uuid
import logging
import asyncio
import bcrypt
import jwt as pyjwt
import resend
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
FRONTEND_URL = os.environ.get('FRONTEND_URL', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@nsracing.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@123')
ADMIN_NICK = os.environ.get('ADMIN_NICK', 'Admin')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="NsRacing API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("nsracing")

# ============= Helpers =============
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception:
        return False

def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> Optional[str]:
    try:
        data = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return data.get("sub")
    except Exception:
        return None

security = HTTPBearer(auto_error=False)

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(401, "Missing token")
    uid = decode_token(creds.credentials)
    if not uid:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    if user.get("banned"):
        raise HTTPException(403, "Banned")
    return user

async def get_optional_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        return None
    uid = decode_token(creds.credentials)
    if not uid:
        return None
    return await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})

async def require_admin(user=Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(403, "Admin required")
    return user

async def send_email_async(to: str, subject: str, html: str):
    if not RESEND_API_KEY:
        logger.info(f"[EMAIL-MOCK] To: {to} | Subject: {subject}\n{html}")
        return
    try:
        params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        logger.error(f"Email failed: {e}")

# ============= Models =============
class RegisterIn(BaseModel):
    nick: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    password: str

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    name_color: Optional[str] = None

class LiveIn(BaseModel):
    title: str
    url: str
    platform: str  # youtube | twitch
    thumbnail: Optional[str] = None
    streamer: Optional[str] = None

class TokenSendIn(BaseModel):
    nick: str
    amount: int

class TokenPurchaseIn(BaseModel):
    package_id: str

class AdminUserAction(BaseModel):
    user_id: str

class AdminTagAssign(BaseModel):
    user_id: str
    tag_id: str

class TagCreate(BaseModel):
    name: str
    tier: int = 1
    rgb: bool = True
    auto_on_purchase: Optional[str] = None  # package_id

# ============= Defaults =============
DEFAULT_TAGS = [
    {"name": "Rookie", "tier": 1}, {"name": "Pitstop", "tier": 2},
    {"name": "Drifter", "tier": 3}, {"name": "Speedster", "tier": 4},
    {"name": "Apex Hunter", "tier": 5}, {"name": "Nitro", "tier": 6},
    {"name": "Turbo", "tier": 7}, {"name": "Veteran", "tier": 8},
    {"name": "Champion", "tier": 9}, {"name": "Pro Racer", "tier": 10},
    {"name": "Track Master", "tier": 11}, {"name": "Burnout King", "tier": 12},
    {"name": "GT Elite", "tier": 13}, {"name": "F1 Legend", "tier": 14},
    {"name": "Pole Position", "tier": 15}, {"name": "Hall of Fame", "tier": 16},
    {"name": "VIP", "tier": 17}, {"name": "MVP", "tier": 18},
    {"name": "Founder", "tier": 19}, {"name": "Owner", "tier": 20},
]

DEFAULT_PACKAGES = [
    {"id": "pkg-flag", "name": "Bandeira Quadriculada", "tokens": 50, "price": 4.99, "symbol": "flag", "auto_tag": "Pitstop"},
    {"id": "pkg-wheel", "name": "Roda de Corrida", "tokens": 120, "price": 9.99, "symbol": "wheel", "auto_tag": "Drifter"},
    {"id": "pkg-helmet", "name": "Capacete Pro", "tokens": 300, "price": 19.99, "symbol": "helmet", "auto_tag": "Speedster"},
    {"id": "pkg-trophy", "name": "Troféu Dourado", "tokens": 700, "price": 39.99, "symbol": "trophy", "auto_tag": "Champion"},
    {"id": "pkg-nitro", "name": "Nitro Boost Mega", "tokens": 1500, "price": 79.99, "symbol": "nitro", "auto_tag": "Nitro"},
    {"id": "pkg-vip", "name": "VIP Garage", "tokens": 3500, "price": 149.99, "symbol": "vip", "auto_tag": "VIP"},
]

DEFAULT_LIVES = [
    {"title": "F1 Grand Prix Highlights", "url": "https://www.youtube.com/embed/szJZQ1uIxJk", "platform": "youtube", "streamer": "F1 Official", "thumbnail": "https://images.pexels.com/photos/28794445/pexels-photo-28794445.jpeg"},
    {"title": "NASCAR Daytona 500 Live", "url": "https://www.youtube.com/embed/Hf1uRzEFp_w", "platform": "youtube", "streamer": "NASCAR", "thumbnail": "https://images.pexels.com/photos/12903127/pexels-photo-12903127.jpeg"},
    {"title": "Drift Battle Tokyo", "url": "https://www.youtube.com/embed/HFlKemX5LQU", "platform": "youtube", "streamer": "DriftKing", "thumbnail": "https://images.pexels.com/photos/3593922/pexels-photo-3593922.jpeg"},
    {"title": "GT3 Endurance Race", "url": "https://www.youtube.com/embed/sV5VgkH4mYE", "platform": "youtube", "streamer": "GT World", "thumbnail": "https://images.pexels.com/photos/27909009/pexels-photo-27909009.jpeg"},
    {"title": "Rally Monte Carlo", "url": "https://www.youtube.com/embed/k-iCBzZ3kxs", "platform": "youtube", "streamer": "WRC", "thumbnail": "https://images.pexels.com/photos/12903128/pexels-photo-12903128.jpeg"},
    {"title": "MotoGP Sprint", "url": "https://www.youtube.com/embed/IKZE7N7iGc8", "platform": "youtube", "streamer": "MotoGP", "thumbnail": "https://images.pexels.com/photos/12903129/pexels-photo-12903129.jpeg"},
    {"title": "Le Mans 24 Hours", "url": "https://www.youtube.com/embed/I9XS3wf4lXk", "platform": "youtube", "streamer": "Le Mans", "thumbnail": "https://images.pexels.com/photos/12903130/pexels-photo-12903130.jpeg"},
    {"title": "Formula E Berlin", "url": "https://www.youtube.com/embed/qNxk1mPx84A", "platform": "youtube", "streamer": "FE Official", "thumbnail": "https://images.pexels.com/photos/12903131/pexels-photo-12903131.jpeg"},
    {"title": "Indy 500 Replay", "url": "https://www.youtube.com/embed/0E00Zuayv9Q", "platform": "youtube", "streamer": "IndyCar", "thumbnail": "https://images.pexels.com/photos/12903132/pexels-photo-12903132.jpeg"},
    {"title": "Time Attack Nürburgring", "url": "https://www.youtube.com/embed/HxZ7sUkONzM", "platform": "youtube", "streamer": "Nordschleife", "thumbnail": "https://images.pexels.com/photos/12903133/pexels-photo-12903133.jpeg"},
    {"title": "Twitch SimRacing Pro", "url": "https://player.twitch.tv/?channel=racing&parent=racing-tokens-arena.preview.emergentagent.com&parent=localhost", "platform": "twitch", "streamer": "SimProTV", "thumbnail": "https://images.pexels.com/photos/12903134/pexels-photo-12903134.jpeg"},
    {"title": "iRacing World Cup", "url": "https://www.youtube.com/embed/dKxhwxBV3i0", "platform": "youtube", "streamer": "iRacing", "thumbnail": "https://images.pexels.com/photos/12903135/pexels-photo-12903135.jpeg"},
    {"title": "Forza Motorsport Online", "url": "https://www.youtube.com/embed/yQGd8eYTrPI", "platform": "youtube", "streamer": "ForzaHub", "thumbnail": "https://images.pexels.com/photos/12903136/pexels-photo-12903136.jpeg"},
    {"title": "Gran Turismo Championship", "url": "https://www.youtube.com/embed/u7XKM7gFlBE", "platform": "youtube", "streamer": "GT Sport", "thumbnail": "https://images.pexels.com/photos/12903137/pexels-photo-12903137.jpeg"},
    {"title": "Karting World Finals", "url": "https://www.youtube.com/embed/qaA40-O_W3Y", "platform": "youtube", "streamer": "FIA Karting", "thumbnail": "https://images.pexels.com/photos/12903138/pexels-photo-12903138.jpeg"},
]

# ============= Seed =============
@app.on_event("startup")
async def startup():
    # tags
    if await db.tags.count_documents({}) == 0:
        for i, t in enumerate(DEFAULT_TAGS):
            await db.tags.insert_one({
                "id": str(uuid.uuid4()),
                "name": t["name"],
                "tier": t["tier"],
                "rgb": True,
                "auto_on_purchase": None,
                "created_at": now_iso(),
            })
    # packages
    if await db.packages.count_documents({}) == 0:
        for p in DEFAULT_PACKAGES:
            await db.packages.insert_one({**p, "created_at": now_iso()})
    # lives
    if await db.lives.count_documents({}) == 0:
        for l in DEFAULT_LIVES:
            await db.lives.insert_one({
                "id": str(uuid.uuid4()),
                **l,
                "views": 0,
                "created_at": now_iso(),
            })
    # admin user
    if not await db.users.find_one({"email": ADMIN_EMAIL}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "nick": ADMIN_NICK,
            "email": ADMIN_EMAIL,
            "password": hash_pw(ADMIN_PASSWORD),
            "is_admin": True,
            "verified": True,
            "banned": False,
            "tokens": 9999,
            "bio": "Founder & Owner of NsRacing",
            "avatar_url": "https://images.unsplash.com/photo-1555532686-d0fccaccadcf",
            "cover_url": "https://images.pexels.com/photos/4758140/pexels-photo-4758140.jpeg",
            "name_color": "#FF1E1E",
            "tags": ["Owner", "Founder", "Hall of Fame"],
            "hours_active": 999,
            "verify_token": None,
            "reset_token": None,
            "reset_expires": None,
            "last_free_claim": None,
            "created_at": now_iso(),
        })
        logger.info(f"Admin seeded: {ADMIN_EMAIL}")
    logger.info("Startup complete.")

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ============= Auth =============
@api.post("/auth/register")
async def register(body: RegisterIn):
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(400, "Email já registrado")
    if await db.users.find_one({"nick": body.nick}):
        raise HTTPException(400, "Nick já em uso")
    verify_token = str(uuid.uuid4())
    user = {
        "id": str(uuid.uuid4()),
        "nick": body.nick,
        "email": body.email,
        "password": hash_pw(body.password),
        "is_admin": False,
        "verified": False,
        "banned": False,
        "tokens": 10,
        "bio": "",
        "avatar_url": "",
        "cover_url": "",
        "name_color": "#00C2FF",
        "tags": ["Rookie"],
        "hours_active": 0,
        "verify_token": verify_token,
        "reset_token": None,
        "reset_expires": None,
        "last_free_claim": None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    user.pop("_id", None)
    verify_link = f"{FRONTEND_URL}/verify?token={verify_token}"
    html = f"""<div style="background:#050505;padding:32px;font-family:sans-serif;color:#fff">
      <h1 style="color:#FF1E1E">NsRacing</h1>
      <p>Bem-vindo, <b>{body.nick}</b>! Confirme seu email:</p>
      <a href="{verify_link}" style="background:#00C2FF;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold">Confirmar Email</a>
      <p style="color:#888">Ou cole: {verify_link}</p>
    </div>"""
    asyncio.create_task(send_email_async(body.email, "NsRacing - Confirme seu email", html))
    token = make_token(user["id"])
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password"}}

@api.get("/auth/verify")
async def verify_email(token: str):
    user = await db.users.find_one({"verify_token": token})
    if not user:
        raise HTTPException(400, "Token inválido")
    await db.users.update_one({"id": user["id"]}, {"$set": {"verified": True, "verify_token": None}})
    return {"ok": True}

@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_pw(body.password, user["password"]):
        raise HTTPException(401, "Credenciais inválidas")
    if user.get("banned"):
        raise HTTPException(403, "Conta banida")
    token = make_token(user["id"])
    user.pop("password", None)
    user.pop("_id", None)
    return {"token": token, "user": user}

@api.post("/auth/forgot")
async def forgot(body: ForgotIn):
    user = await db.users.find_one({"email": body.email})
    if not user:
        return {"ok": True}  # don't reveal
    reset_token = str(uuid.uuid4())
    expires = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    await db.users.update_one({"id": user["id"]}, {"$set": {"reset_token": reset_token, "reset_expires": expires}})
    link = f"{FRONTEND_URL}/reset?token={reset_token}"
    html = f"""<div style="background:#050505;padding:32px;font-family:sans-serif;color:#fff">
      <h1 style="color:#FF1E1E">NsRacing</h1>
      <p>Reset de senha solicitado:</p>
      <a href="{link}" style="background:#FF1E1E;color:#fff;padding:12px 24px;text-decoration:none;font-weight:bold">Resetar senha</a>
      <p style="color:#888">Expira em 2 horas. Se não foi você, ignore.</p>
    </div>"""
    asyncio.create_task(send_email_async(body.email, "NsRacing - Reset de senha", html))
    return {"ok": True}

@api.post("/auth/reset")
async def reset(body: ResetIn):
    user = await db.users.find_one({"reset_token": body.token})
    if not user:
        raise HTTPException(400, "Token inválido")
    if user.get("reset_expires") and user["reset_expires"] < now_iso():
        raise HTTPException(400, "Token expirado")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password": hash_pw(body.password), "reset_token": None, "reset_expires": None}})
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

# ============= Profile =============
@api.put("/profile")
async def update_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    return await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})

@api.get("/profile/{nick}")
async def get_profile(nick: str):
    u = await db.users.find_one({"nick": nick}, {"_id": 0, "password": 0, "verify_token": 0, "reset_token": 0, "reset_expires": 0, "email": 0})
    if not u:
        raise HTTPException(404, "Não encontrado")
    return u

# ============= Tokens =============
@api.get("/packages")
async def list_packages():
    return await db.packages.find({}, {"_id": 0}).to_list(100)

@api.post("/tokens/purchase")
async def purchase(body: TokenPurchaseIn, user=Depends(get_current_user)):
    pkg = await db.packages.find_one({"id": body.package_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(404, "Pacote não encontrado")
    new_tags = list(set(user.get("tags", []) + ([pkg["auto_tag"]] if pkg.get("auto_tag") else [])))
    await db.users.update_one({"id": user["id"]}, {"$inc": {"tokens": pkg["tokens"]}, "$set": {"tags": new_tags}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "type": "purchase", "package": pkg["name"], "tokens": pkg["tokens"], "at": now_iso()})
    return {"ok": True, "tokens_added": pkg["tokens"], "auto_tag": pkg.get("auto_tag")}

@api.post("/tokens/send")
async def send_tokens(body: TokenSendIn, user=Depends(get_current_user)):
    if body.amount <= 0:
        raise HTTPException(400, "Inválido")
    if user["tokens"] < body.amount:
        raise HTTPException(400, "Saldo insuficiente")
    receiver = await db.users.find_one({"nick": body.nick})
    if not receiver:
        raise HTTPException(404, "Membro não encontrado")
    if receiver["id"] == user["id"]:
        raise HTTPException(400, "Não pode enviar a si mesmo")
    await db.users.update_one({"id": user["id"]}, {"$inc": {"tokens": -body.amount}})
    await db.users.update_one({"id": receiver["id"]}, {"$inc": {"tokens": body.amount}})
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "from": user["nick"], "to": receiver["nick"], "amount": body.amount, "type": "transfer", "at": now_iso()})
    return {"ok": True}

@api.post("/tokens/claim-free")
async def claim_free(user=Depends(get_current_user)):
    last = user.get("last_free_claim")
    if last:
        last_dt = datetime.fromisoformat(last)
        diff = datetime.now(timezone.utc) - last_dt
        if diff < timedelta(hours=10):
            remain = timedelta(hours=10) - diff
            raise HTTPException(429, f"Aguarde {int(remain.total_seconds()//60)} minutos")
    await db.users.update_one({"id": user["id"]}, {"$inc": {"tokens": 2}, "$set": {"last_free_claim": now_iso()}})
    return {"ok": True, "tokens_added": 2}

@api.get("/tokens/next-claim")
async def next_claim(user=Depends(get_current_user)):
    last = user.get("last_free_claim")
    if not last:
        return {"ready": True, "seconds_remaining": 0}
    last_dt = datetime.fromisoformat(last)
    diff = datetime.now(timezone.utc) - last_dt
    if diff >= timedelta(hours=10):
        return {"ready": True, "seconds_remaining": 0}
    return {"ready": False, "seconds_remaining": int((timedelta(hours=10) - diff).total_seconds())}

# ============= Lives =============
@api.get("/lives")
async def list_lives():
    return await db.lives.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api.post("/lives/{live_id}/view")
async def add_view(live_id: str):
    await db.lives.update_one({"id": live_id}, {"$inc": {"views": 1}})
    return {"ok": True}

@api.post("/lives")
async def create_live(body: LiveIn, _=Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "views": 0, "created_at": now_iso()}
    await db.lives.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/lives/{live_id}")
async def delete_live(live_id: str, _=Depends(require_admin)):
    await db.lives.delete_one({"id": live_id})
    return {"ok": True}

@api.get("/tops")
async def top_lives():
    return await db.lives.find({}, {"_id": 0}).sort("views", -1).limit(20).to_list(20)

# ============= Tags =============
@api.get("/tags")
async def list_tags():
    return await db.tags.find({}, {"_id": 0}).sort("tier", 1).to_list(100)

@api.post("/tags")
async def create_tag(body: TagCreate, _=Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.tags.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/tags/{tag_id}")
async def delete_tag(tag_id: str, _=Depends(require_admin)):
    await db.tags.delete_one({"id": tag_id})
    return {"ok": True}

# ============= Ranks =============
@api.get("/ranks")
async def ranks():
    tags = await db.tags.find({}, {"_id": 0}).to_list(200)
    tag_tier = {t["name"]: t["tier"] for t in tags}
    users = await db.users.find({"banned": {"$ne": True}}, {"_id": 0, "password": 0, "email": 0, "verify_token": 0, "reset_token": 0}).to_list(1000)
    def best_tier(u):
        return max([tag_tier.get(t, 0) for t in u.get("tags", [])] or [0])
    users.sort(key=lambda u: (best_tier(u), u.get("hours_active", 0)), reverse=True)
    top_hours = sorted(users, key=lambda u: u.get("hours_active", 0), reverse=True)[:10]
    return {"by_rank": users[:50], "top_hours": top_hours}

# ============= Stats =============
@api.get("/stats")
async def stats():
    total = await db.users.count_documents({})
    online = len(connected_clients)
    users = await db.users.find({}, {"_id": 0, "nick": 1, "hours_active": 1, "tags": 1, "name_color": 1, "avatar_url": 1}).sort("hours_active", -1).limit(10).to_list(10)
    return {"registered": total, "online": online, "top10_hours": users}

# ============= Admin =============
@api.get("/admin/users")
async def admin_users(_=Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)

@api.post("/admin/ban")
async def admin_ban(body: AdminUserAction, _=Depends(require_admin)):
    await db.users.update_one({"id": body.user_id}, {"$set": {"banned": True}})
    return {"ok": True}

@api.post("/admin/unban")
async def admin_unban(body: AdminUserAction, _=Depends(require_admin)):
    await db.users.update_one({"id": body.user_id}, {"$set": {"banned": False}})
    return {"ok": True}

@api.post("/admin/kick")
async def admin_kick(body: AdminUserAction, _=Depends(require_admin)):
    # disconnect from chat
    for ws, info in list(connected_clients.items()):
        if info.get("user_id") == body.user_id:
            try:
                await ws.close()
            except Exception:
                pass
    return {"ok": True}

@api.post("/admin/assign-tag")
async def admin_assign(body: AdminTagAssign, _=Depends(require_admin)):
    tag = await db.tags.find_one({"id": body.tag_id}, {"_id": 0})
    if not tag:
        raise HTTPException(404, "Tag não encontrada")
    user = await db.users.find_one({"id": body.user_id})
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    new_tags = list(set(user.get("tags", []) + [tag["name"]]))
    await db.users.update_one({"id": body.user_id}, {"$set": {"tags": new_tags}})
    return {"ok": True}

@api.post("/admin/remove-tag")
async def admin_remove_tag(body: AdminTagAssign, _=Depends(require_admin)):
    tag = await db.tags.find_one({"id": body.tag_id}, {"_id": 0})
    if not tag:
        raise HTTPException(404)
    user = await db.users.find_one({"id": body.user_id})
    if not user:
        raise HTTPException(404)
    new_tags = [t for t in user.get("tags", []) if t != tag["name"]]
    await db.users.update_one({"id": body.user_id}, {"$set": {"tags": new_tags}})
    return {"ok": True}

@api.post("/admin/promote")
async def admin_promote(body: AdminUserAction, _=Depends(require_admin)):
    await db.users.update_one({"id": body.user_id}, {"$set": {"is_admin": True}})
    return {"ok": True}

@api.post("/admin/demote")
async def admin_demote(body: AdminUserAction, _=Depends(require_admin)):
    await db.users.update_one({"id": body.user_id}, {"$set": {"is_admin": False}})
    return {"ok": True}

# ============= Chat (WebSocket) =============
connected_clients: dict = {}  # ws -> {user_id, nick, name_color, tags}

@api.get("/chat/history")
async def chat_history():
    msgs = await db.chat.find({}, {"_id": 0}).sort("at", -1).limit(50).to_list(50)
    return list(reversed(msgs))

async def broadcast(msg: dict):
    dead = []
    for ws in list(connected_clients.keys()):
        try:
            await ws.send_json(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connected_clients.pop(ws, None)

@app.websocket("/api/ws/chat")
async def ws_chat(ws: WebSocket, token: Optional[str] = None):
    await ws.accept()
    # auth via query param
    qs = ws.query_params
    tok = qs.get("token")
    if not tok:
        await ws.close(code=4401)
        return
    uid = decode_token(tok)
    if not uid:
        await ws.close(code=4401)
        return
    user = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
    if not user or user.get("banned"):
        await ws.close(code=4403)
        return
    connected_clients[ws] = {"user_id": uid, "nick": user["nick"]}
    try:
        # send recent history
        history = await db.chat.find({}, {"_id": 0}).sort("at", -1).limit(50).to_list(50)
        await ws.send_json({"type": "history", "messages": list(reversed(history))})
        await broadcast({"type": "presence", "online": len(connected_clients)})
        while True:
            data = await ws.receive_json()
            text = (data.get("text") or "").strip()[:500]
            if not text:
                continue
            # refresh user info
            user = await db.users.find_one({"id": uid}, {"_id": 0, "password": 0})
            if user.get("banned"):
                await ws.close(code=4403)
                return
            msg = {
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "nick": user["nick"],
                "name_color": user.get("name_color", "#00C2FF"),
                "tags": user.get("tags", []),
                "text": text,
                "at": now_iso(),
            }
            await db.chat.insert_one(dict(msg))
            await broadcast({"type": "message", "message": msg})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"ws err: {e}")
    finally:
        connected_clients.pop(ws, None)
        try:
            await broadcast({"type": "presence", "online": len(connected_clients)})
        except Exception:
            pass

# ============= Mount =============
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
