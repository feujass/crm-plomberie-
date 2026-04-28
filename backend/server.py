from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os, logging, bcrypt, jwt, secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

# ─── Config ───────────────────────────────────────────────────────
JWT_ALGORITHM = "HS256"
mongo_url = os.environ.get("MONGO_URL")
if not mongo_url:
    raise RuntimeError(
        "MONGO_URL manquant. Crée /Users/jules/Desktop/CRM/backend/.env avec MONGO_URL et DB_NAME "
        "(ex: MONGO_URL=mongodb://localhost:27017 et DB_NAME=plombicrm)."
    )
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
db_name = os.environ.get("DB_NAME")
if not db_name:
    raise RuntimeError(
        "DB_NAME manquant. Crée /Users/jules/Desktop/CRM/backend/.env avec DB_NAME "
        "(ex: DB_NAME=plombicrm)."
    )
db = client[db_name]

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── CORS ─────────────────────────────────────────────────────────
def _cors_allowed_origins() -> List[str]:
    """CORS_ALLOW_ORIGINS = liste séparée par des virgules. Défaut * (dev). Ex. prod: https://app.flowo.fr"""
    raw = os.environ.get("CORS_ALLOW_ORIGINS", "").strip()
    if not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_allowed_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Helpers ──────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode({"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30), "type": "refresh"}, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token invalide")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        user = serialize_doc(user)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

# ─── Pydantic Models ─────────────────────────────────────────────
class RegisterInput(BaseModel):
    email: str
    password: str
    nom: str = ""
    prenom: str = ""

class LoginInput(BaseModel):
    email: str
    password: str

class UserMeUpdate(BaseModel):
    """Identité affichée (prénom puis nom) — mis à jour depuis Paramètres."""
    prenom: str = ""
    nom: str = ""


class ProfileUpdate(BaseModel):
    entreprise: Optional[str] = None
    siret: Optional[str] = None
    adresse: Optional[str] = None
    tel: Optional[str] = None
    email_facturation: Optional[str] = None
    logo_url: Optional[str] = None
    tva_defaut: Optional[float] = None
    sep_fourniture_pose: Optional[bool] = None
    structure_devis: Optional[str] = None
    mention_legale: Optional[str] = None
    conditions_paiement: Optional[str] = None
    onboarding_step: Optional[int] = None
    onboarding_complete: Optional[bool] = None
    pays: Optional[str] = None
    use_personal_library: Optional[bool] = None
    assistant_name: Optional[str] = None

class ChantierInput(BaseModel):
    name: str
    client_id: Optional[str] = None
    devis_id: Optional[str] = None
    status: Optional[str] = "Planifié"  # Planifié | En cours | Urgent | Terminé
    due_date: Optional[str] = None  # YYYY-MM-DD
    responsible: Optional[str] = ""
    comment: Optional[str] = ""
    site_address: Optional[str] = ""
    chantier_type: Optional[str] = "plomberie"
    budget_estime: Optional[float] = 0
    heures_prevues: Optional[float] = 0
    heures_passees: Optional[float] = 0
    etape_metier: Optional[str] = "terrassement"
    photo_urls: Optional[List[str]] = []
    a_relancer: Optional[bool] = False


class ChantierUpdateInput(BaseModel):
    name: Optional[str] = None
    client_id: Optional[str] = None
    devis_id: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    responsible: Optional[str] = None
    comment: Optional[str] = None
    site_address: Optional[str] = None
    chantier_type: Optional[str] = None
    budget_estime: Optional[float] = None
    heures_prevues: Optional[float] = None
    heures_passees: Optional[float] = None
    etape_metier: Optional[str] = None
    photo_urls: Optional[List[str]] = None
    a_relancer: Optional[bool] = None

class ClientInput(BaseModel):
    nom: str
    prenom: Optional[str] = ""
    email: Optional[str] = ""
    tel: Optional[str] = ""
    adresse: Optional[str] = ""
    type: Optional[str] = "particulier"
    siret: Optional[str] = ""
    notes: Optional[str] = ""
    inactive: Optional[bool] = False

class OuvrageInput(BaseModel):
    nom: str
    description: Optional[str] = ""
    type: Optional[str] = "ouvrage"
    prix_ht: Optional[float] = 0
    unite: Optional[str] = "forfait"
    tva: Optional[float] = 10
    tags: Optional[List[str]] = []

class DevisLineInput(BaseModel):
    section: Optional[str] = ""
    designation: str
    quantite: Optional[float] = 1
    unite: Optional[str] = "u"
    prix_ht: Optional[float] = 0
    tva: Optional[float] = 10

class DevisInput(BaseModel):
    client_id: Optional[str] = None
    notes: Optional[str] = ""
    internal_notes: Optional[str] = ""
    date_expiration: Optional[str] = None
    remise_type: Optional[str] = None
    remise_valeur: Optional[float] = 0
    lignes: Optional[List[DevisLineInput]] = []

class DevisUpdateInput(BaseModel):
    client_id: Optional[str] = None
    statut: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    date_expiration: Optional[str] = None
    remise_type: Optional[str] = None
    remise_valeur: Optional[float] = None


class InternalNoteAppendInput(BaseModel):
    text: str

class PaiementInput(BaseModel):
    montant: float
    date: Optional[str] = None
    mode: Optional[str] = "virement"

class AIGenerateInput(BaseModel):
    description: str

class AIChatInput(BaseModel):
    message: str
    session_id: Optional[str] = None

# ─── AUTH ENDPOINTS ───────────────────────────────────────────────
@api.post("/auth/register")
async def register(input: RegisterInput):
    email = input.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user_doc = {
        "email": email,
        "password_hash": hash_password(input.password),
        "nom": input.nom,
        "prenom": input.prenom,
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    # Create profile
    await db.profiles.insert_one({
        "user_id": user_id,
        "entreprise": "",
        "siret": "",
        "adresse": "",
        "tel": "",
        "email_facturation": email,
        "logo_url": "",
        "tva_defaut": 10,
        "sep_fourniture_pose": False,
        "structure_devis": "libre",
        "mention_legale": "",
        "conditions_paiement": "Paiement à 30 jours",
        "onboarding_step": 0,
        "onboarding_complete": False,
    })
    token = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    return {"token": token, "refresh_token": refresh, "user": {"id": user_id, "email": email, "nom": input.nom, "prenom": input.prenom, "role": "user"}}

@api.post("/auth/login")
async def login(input: LoginInput):
    email = input.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    user_id = str(user["_id"])
    token = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    return {"token": token, "refresh_token": refresh, "user": {"id": user_id, "email": email, "nom": user.get("nom", ""), "prenom": user.get("prenom", ""), "role": user.get("role", "user")}}

@api.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return {**user, "profile": profile}


@api.put("/auth/me")
async def update_me(input: UserMeUpdate, user=Depends(get_current_user)):
    uid = user["id"]
    await db.users.update_one(
        {"_id": ObjectId(uid)},
        {"$set": {"prenom": input.prenom.strip(), "nom": input.nom.strip()}},
    )
    updated = await db.users.find_one({"_id": ObjectId(uid)})
    updated = serialize_doc(updated)
    updated.pop("password_hash", None)
    profile = await db.profiles.find_one({"user_id": uid}, {"_id": 0})
    return {**updated, "profile": profile}


@api.post("/auth/logout")
async def logout():
    return {"message": "Déconnecté"}

# ─── PROFILE ENDPOINTS ───────────────────────────────────────────
@api.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return profile or {}

@api.put("/profile")
async def update_profile(input: ProfileUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    if update_data:
        await db.profiles.update_one({"user_id": user["id"]}, {"$set": update_data}, upsert=True)
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return profile

# ─── CHANTIERS ENDPOINTS ─────────────────────────────────────────
@api.get("/chantiers")
async def list_chantiers(user=Depends(get_current_user), search: str = "", status: str = ""):
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    rows = await db.chantiers.find(query).sort("due_date", 1).to_list(500)
    return [serialize_doc(r) for r in rows]


@api.post("/chantiers")
async def create_chantier(input: ChantierInput, user=Depends(get_current_user)):
    doc = input.dict()
    doc["user_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc)
    doc["updated_at"] = datetime.now(timezone.utc)
    result = await db.chantiers.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@api.get("/chantiers/{chantier_id}")
async def get_chantier(chantier_id: str, user=Depends(get_current_user)):
    c = await db.chantiers.find_one({"_id": ObjectId(chantier_id), "user_id": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Chantier introuvable")
    return serialize_doc(c)


@api.put("/chantiers/{chantier_id}")
async def update_chantier(chantier_id: str, input: ChantierUpdateInput, user=Depends(get_current_user)):
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.chantiers.update_one(
            {"_id": ObjectId(chantier_id), "user_id": user["id"]},
            {"$set": update_data},
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Chantier introuvable")
    c = await db.chantiers.find_one({"_id": ObjectId(chantier_id), "user_id": user["id"]})
    return serialize_doc(c)


@api.delete("/chantiers/{chantier_id}")
async def delete_chantier(chantier_id: str, user=Depends(get_current_user)):
    result = await db.chantiers.delete_one({"_id": ObjectId(chantier_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chantier introuvable")
    return {"message": "Chantier supprimé"}

# ─── CLIENTS ENDPOINTS ───────────────────────────────────────────
@api.get("/clients")
async def list_clients(user=Depends(get_current_user), search: str = "", type: str = ""):
    query = {"user_id": user["id"]}
    if search:
        query["$or"] = [
            {"nom": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"tel": {"$regex": search, "$options": "i"}},
        ]
    if type:
        query["type"] = type
    clients = await db.clients.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(c) for c in clients]

@api.post("/clients")
async def create_client(input: ClientInput, user=Depends(get_current_user)):
    doc = input.dict()
    doc["user_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.clients.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api.get("/clients/{client_id}")
async def get_client(client_id: str, user=Depends(get_current_user)):
    c = await db.clients.find_one({"_id": ObjectId(client_id), "user_id": user["id"]})
    if not c:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    client = serialize_doc(c)
    # Get stats
    devis = await db.devis.find({"client_id": client_id, "user_id": user["id"]}).to_list(500)
    factures = await db.factures.find({"client_id": client_id, "user_id": user["id"]}).to_list(500)
    client["devis_count"] = len(devis)
    client["factures_count"] = len(factures)
    client["ca_total"] = sum(d.get("total_ttc", 0) for d in devis if d.get("statut") == "accepte")
    client["devis"] = [serialize_doc(d) for d in devis[:10]]
    client["factures"] = [serialize_doc(f) for f in factures[:10]]
    return client

@api.put("/clients/{client_id}")
async def update_client(client_id: str, input: ClientInput, user=Depends(get_current_user)):
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    result = await db.clients.update_one({"_id": ObjectId(client_id), "user_id": user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    c = await db.clients.find_one({"_id": ObjectId(client_id)})
    return serialize_doc(c)

@api.delete("/clients/{client_id}")
async def delete_client(client_id: str, user=Depends(get_current_user)):
    result = await db.clients.delete_one({"_id": ObjectId(client_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Client supprimé"}

# ─── OUVRAGES (CATALOGUE) ENDPOINTS ──────────────────────────────
@api.get("/ouvrages")
async def list_ouvrages(user=Depends(get_current_user), search: str = "", type: str = ""):
    query = {"user_id": user["id"]}
    if search:
        query["nom"] = {"$regex": search, "$options": "i"}
    if type:
        query["type"] = type
    ouvrages = await db.ouvrages.find(query).sort("nom", 1).to_list(500)
    return [serialize_doc(o) for o in ouvrages]

@api.post("/ouvrages")
async def create_ouvrage(input: OuvrageInput, user=Depends(get_current_user)):
    doc = input.dict()
    doc["user_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.ouvrages.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api.get("/ouvrages/{ouvrage_id}")
async def get_ouvrage(ouvrage_id: str, user=Depends(get_current_user)):
    o = await db.ouvrages.find_one({"_id": ObjectId(ouvrage_id), "user_id": user["id"]})
    if not o:
        raise HTTPException(status_code=404, detail="Ouvrage non trouvé")
    return serialize_doc(o)

@api.put("/ouvrages/{ouvrage_id}")
async def update_ouvrage(ouvrage_id: str, input: OuvrageInput, user=Depends(get_current_user)):
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    result = await db.ouvrages.update_one({"_id": ObjectId(ouvrage_id), "user_id": user["id"]}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ouvrage non trouvé")
    o = await db.ouvrages.find_one({"_id": ObjectId(ouvrage_id)})
    return serialize_doc(o)

@api.delete("/ouvrages/{ouvrage_id}")
async def delete_ouvrage(ouvrage_id: str, user=Depends(get_current_user)):
    result = await db.ouvrages.delete_one({"_id": ObjectId(ouvrage_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ouvrage non trouvé")
    return {"message": "Ouvrage supprimé"}

@api.post("/ouvrages/seed-defaults")
async def seed_default_ouvrages(user=Depends(get_current_user)):
    defaults = [
        {
            "nom": "Taux horaire standard",
            "description": "Tarif horaire de base pour la main d'œuvre",
            "type": "main_oeuvre",
            "prix_ht": 50,
            "unite": "h",
            "tva": 10,
            "tags": ["exemple"],
        },
        {
            "nom": "Lame de parquet chêne massif",
            "description": "Exemple de fourniture — personnalisable après ajout.",
            "type": "fourniture",
            "prix_ht": 48,
            "unite": "m²",
            "tva": 10,
            "tags": ["exemple", "fourniture"],
        },
        {
            "nom": "Pose et finition",
            "description": "Exemple d'ouvrage — prestation et mise en œuvre.",
            "type": "ouvrage",
            "prix_ht": 35,
            "unite": "m²",
            "tva": 10,
            "tags": ["exemple"],
        },
    ]
    for d in defaults:
        d["user_id"] = user["id"]
        d["created_at"] = datetime.now(timezone.utc)
    await db.ouvrages.insert_many(defaults)
    return {"message": "Ouvrages par défaut créés", "count": len(defaults)}

# ─── DEVIS ENDPOINTS ─────────────────────────────────────────────
def calc_devis_totals(lignes):
    total_ht = 0
    total_tva = 0
    for l in lignes:
        line_ht = l.get("quantite", 1) * l.get("prix_ht", 0)
        l["total_ht"] = round(line_ht, 2)
        line_tva = line_ht * l.get("tva", 10) / 100
        total_ht += line_ht
        total_tva += line_tva
    return round(total_ht, 2), round(total_tva, 2), round(total_ht + total_tva, 2)

async def get_next_devis_number(user_id):
    count = await db.devis.count_documents({"user_id": user_id})
    year = datetime.now().year
    return f"DEV-{year}-{count + 1:04d}"

@api.get("/devis")
async def list_devis(user=Depends(get_current_user), search: str = "", statut: str = "", segment: str = ""):
    query = {"user_id": user["id"]}
    if segment == "brouillon":
        query["statut"] = "brouillon"
    elif segment == "en_cours":
        query["statut"] = {"$in": ["envoye"]}
    elif segment == "termine":
        query["statut"] = {"$in": ["accepte", "refuse", "facture", "archive", "expire"]}
    elif statut:
        query["statut"] = statut
    if search:
        query["$or"] = [
            {"numero": {"$regex": search, "$options": "i"}},
            {"client_nom": {"$regex": search, "$options": "i"}},
        ]
    devis_list = await db.devis.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(d) for d in devis_list]

@api.post("/devis")
async def create_devis(input: DevisInput, user=Depends(get_current_user)):
    lignes = [l.dict() for l in (input.lignes or [])]
    total_ht, total_tva, total_ttc = calc_devis_totals(lignes)
    # Apply discount
    if input.remise_type == "pourcentage" and input.remise_valeur:
        discount = total_ht * input.remise_valeur / 100
        total_ht -= discount
        total_tva = total_ht * 0.1  # Simplified
        total_ttc = total_ht + total_tva
    elif input.remise_type == "montant" and input.remise_valeur:
        total_ht -= input.remise_valeur
        total_tva = total_ht * 0.1
        total_ttc = total_ht + total_tva

    client_nom = ""
    if input.client_id:
        c = await db.clients.find_one({"_id": ObjectId(input.client_id)})
        if c:
            client_nom = c.get("nom", "") + " " + c.get("prenom", "")

    numero = await get_next_devis_number(user["id"])
    doc = {
        "user_id": user["id"],
        "client_id": input.client_id or "",
        "client_nom": client_nom.strip(),
        "numero": numero,
        "statut": "brouillon",
        "lignes": lignes,
        "total_ht": round(total_ht, 2),
        "total_tva": round(total_tva, 2),
        "total_ttc": round(total_ttc, 2),
        "notes": input.notes or "",
        "internal_notes": input.internal_notes or "",
        "date_expiration": input.date_expiration or "",
        "remise_type": input.remise_type or "",
        "remise_valeur": input.remise_valeur or 0,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.devis.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api.get("/devis/{devis_id}")
async def get_devis(devis_id: str, user=Depends(get_current_user)):
    d = await db.devis.find_one({"_id": ObjectId(devis_id), "user_id": user["id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return serialize_doc(d)

@api.put("/devis/{devis_id}")
async def update_devis(devis_id: str, input: DevisUpdateInput, user=Depends(get_current_user)):
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    if "client_id" in update_data and update_data["client_id"]:
        c = await db.clients.find_one({"_id": ObjectId(update_data["client_id"])})
        if c:
            update_data["client_nom"] = (c.get("nom", "") + " " + c.get("prenom", "")).strip()
    await db.devis.update_one({"_id": ObjectId(devis_id), "user_id": user["id"]}, {"$set": update_data})
    d = await db.devis.find_one({"_id": ObjectId(devis_id)})
    return serialize_doc(d)


@api.post("/devis/{devis_id}/internal-notes")
async def append_internal_note(devis_id: str, body: InternalNoteAppendInput, user=Depends(get_current_user)):
    """Ajoute une note interne au devis (n’apparaît pas au client)."""
    fragment = body.text.strip() if isinstance(body.text, str) else ""
    if not fragment:
        raise HTTPException(status_code=400, detail="Texte vide")
    d = await db.devis.find_one({"_id": ObjectId(devis_id), "user_id": user["id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    prev = str(d.get("internal_notes") or "").strip()
    new_val = f"{prev}\n\n{fragment}" if prev else fragment
    await db.devis.update_one(
        {"_id": ObjectId(devis_id), "user_id": user["id"]},
        {"$set": {"internal_notes": new_val}},
    )
    rd = await db.devis.find_one({"_id": ObjectId(devis_id)})
    return serialize_doc(rd)


@api.put("/devis/{devis_id}/lignes")
async def update_devis_lignes(devis_id: str, lignes: List[DevisLineInput], user=Depends(get_current_user)):
    lignes_data = [l.dict() for l in lignes]
    total_ht, total_tva, total_ttc = calc_devis_totals(lignes_data)
    await db.devis.update_one(
        {"_id": ObjectId(devis_id), "user_id": user["id"]},
        {"$set": {"lignes": lignes_data, "total_ht": total_ht, "total_tva": total_tva, "total_ttc": total_ttc}}
    )
    d = await db.devis.find_one({"_id": ObjectId(devis_id)})
    return serialize_doc(d)

@api.delete("/devis/{devis_id}")
async def delete_devis(devis_id: str, user=Depends(get_current_user)):
    result = await db.devis.delete_one({"_id": ObjectId(devis_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    return {"message": "Devis supprimé"}

# ─── FACTURES ENDPOINTS ──────────────────────────────────────────
async def get_next_facture_number(user_id):
    count = await db.factures.count_documents({"user_id": user_id})
    year = datetime.now().year
    return f"FACT-{year}-{count + 1:04d}"

@api.get("/factures")
async def list_factures(user=Depends(get_current_user), statut: str = ""):
    query = {"user_id": user["id"]}
    if statut:
        query["statut"] = statut
    factures = await db.factures.find(query).sort("created_at", -1).to_list(500)
    return [serialize_doc(f) for f in factures]

@api.post("/factures/from-devis/{devis_id}")
async def create_facture_from_devis(devis_id: str, user=Depends(get_current_user)):
    d = await db.devis.find_one({"_id": ObjectId(devis_id), "user_id": user["id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    numero = await get_next_facture_number(user["id"])
    facture_doc = {
        "user_id": user["id"],
        "devis_id": devis_id,
        "client_id": d.get("client_id", ""),
        "client_nom": d.get("client_nom", ""),
        "numero": numero,
        "statut": "emise",
        "lignes": d.get("lignes", []),
        "total_ht": d.get("total_ht", 0),
        "total_tva": d.get("total_tva", 0),
        "total_ttc": d.get("total_ttc", 0),
        "notes": d.get("notes", ""),
        "date_emission": datetime.now(timezone.utc),
        "date_echeance": (datetime.now(timezone.utc) + timedelta(days=30)),
        "paiements": [],
        "montant_paye": 0,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.factures.insert_one(facture_doc)
    facture_doc["id"] = str(result.inserted_id)
    facture_doc.pop("_id", None)
    # Update devis status
    await db.devis.update_one({"_id": ObjectId(devis_id)}, {"$set": {"statut": "facture"}})
    return serialize_doc(facture_doc)

@api.get("/factures/{facture_id}")
async def get_facture(facture_id: str, user=Depends(get_current_user)):
    f = await db.factures.find_one({"_id": ObjectId(facture_id), "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return serialize_doc(f)

@api.post("/factures/{facture_id}/paiements")
async def add_paiement(facture_id: str, input: PaiementInput, user=Depends(get_current_user)):
    f = await db.factures.find_one({"_id": ObjectId(facture_id), "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    paiement = {
        "id": str(uuid.uuid4()),
        "montant": input.montant,
        "date": input.date or datetime.now(timezone.utc).isoformat(),
        "mode": input.mode,
    }
    paiements = f.get("paiements", [])
    paiements.append(paiement)
    montant_paye = sum(p["montant"] for p in paiements)
    statut = "payee" if montant_paye >= f["total_ttc"] else "partiellement_payee"
    await db.factures.update_one(
        {"_id": ObjectId(facture_id)},
        {"$set": {"paiements": paiements, "montant_paye": montant_paye, "statut": statut}}
    )
    updated = await db.factures.find_one({"_id": ObjectId(facture_id)})
    return serialize_doc(updated)

# ─── DASHBOARD STATS ──────────────────────────────────────────────
@api.get("/dashboard/stats")
async def get_dashboard_stats(user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    all_devis = await db.devis.find({"user_id": user["id"]}).to_list(1000)
    def is_this_month(d):
        ca = d.get("created_at")
        if not ca:
            return False
        if ca.tzinfo is None:
            ca = ca.replace(tzinfo=timezone.utc)
        return ca >= month_start
    month_devis = [d for d in all_devis if is_this_month(d)]
    sent_waiting = [d for d in all_devis if d.get("statut") == "envoye"]
    # Un devis facturé passe en statut "facture" (voir /factures/from-devis) : il reste un devis "gagné"
    # comme "accepte" pour le CA ; le taux doit les inclure au numérateur et au dénominateur.
    statuts_acceptes = ("accepte", "facture")
    statuts_taux_denombre = ("envoye", "accepte", "refuse", "facture")

    ca_mois = sum(d.get("total_ttc", 0) for d in month_devis if d.get("statut") in ["accepte", "facture"])
    total_accepted = len([d for d in all_devis if d.get("statut") in statuts_acceptes])
    total_envoyes_avec_reponse = len([d for d in all_devis if d.get("statut") in statuts_taux_denombre])
    taux_acceptation = round(
        (total_accepted / total_envoyes_avec_reponse * 100) if total_envoyes_avec_reponse > 0 else 0,
        1,
    )
    montant_attente = sum(d.get("total_ttc", 0) for d in sent_waiting)

    # Recent devis
    recent_devis = sorted(all_devis, key=lambda x: x.get("created_at", datetime.min), reverse=True)[:3]

    # Unpaid invoices
    factures_impayees = await db.factures.find({"user_id": user["id"], "statut": {"$in": ["emise", "partiellement_payee"]}}).to_list(100)
    montant_impaye = sum(f.get("total_ttc", 0) - f.get("montant_paye", 0) for f in factures_impayees)

    # Client count
    client_count = await db.clients.count_documents({"user_id": user["id"]})

    return {
        "devis_du_mois": len(month_devis),
        "taux_acceptation": taux_acceptation,
        "ca_mois": round(ca_mois, 2),
        "montant_attente": round(montant_attente, 2),
        "montant_impaye": round(montant_impaye, 2),
        "client_count": client_count,
        "recent_devis": [serialize_doc(d) for d in recent_devis],
        "relances": [serialize_doc(d) for d in sent_waiting[:5]],
    }


def _utc_month_start(year: int, month: int) -> datetime:
    return datetime(year, month, 1, tzinfo=timezone.utc)


def _utc_month_end_exclusive(year: int, month: int) -> datetime:
    if month == 12:
        return datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    return datetime(year, month + 1, 1, tzinfo=timezone.utc)


def _devis_ca_accepte_facture_dans_mois(all_devis: list, start: datetime, end: datetime) -> float:
    """CA = somme TTC des devis acceptés ou facturés, filtrés sur created_at dans [start, end)."""
    total = 0.0
    for d in all_devis:
        if d.get("statut") not in ("accepte", "facture"):
            continue
        ca = d.get("created_at")
        if not ca:
            continue
        if ca.tzinfo is None:
            ca = ca.replace(tzinfo=timezone.utc)
        if start <= ca < end:
            total += float(d.get("total_ttc") or 0)
    return total


@api.get("/dashboard/rentabilite")
async def get_dashboard_rentabilite(user=Depends(get_current_user)):
    """
    Même source de vérité que /dashboard/stats (MongoDB), pour l’écran Rentabilité.
    Le CA mensuel = devis acceptés ou facturés créés sur le mois (comme ca_mois de l’accueil).
    """
    now = datetime.now(timezone.utc)
    all_devis = await db.devis.find({"user_id": user["id"]}).to_list(5000)

    cur_start = _utc_month_start(now.year, now.month)
    cur_end = _utc_month_end_exclusive(now.year, now.month)
    if now.month == 1:
        prev_y, prev_m = now.year - 1, 12
    else:
        prev_y, prev_m = now.year, now.month - 1
    prev_start = _utc_month_start(prev_y, prev_m)
    prev_end = _utc_month_end_exclusive(prev_y, prev_m)

    ca_mois = round(_devis_ca_accepte_facture_dans_mois(all_devis, cur_start, cur_end), 2)
    ca_mois_prec = round(_devis_ca_accepte_facture_dans_mois(all_devis, prev_start, prev_end), 2)

    devis_crees = len(all_devis)
    devis_envoyes = len([d for d in all_devis if d.get("statut") == "envoye"])
    devis_acceptes = len([d for d in all_devis if d.get("statut") in ("accepte", "facture")])
    devis_refuses = len([d for d in all_devis if d.get("statut") == "refuse"])
    montant_moyen_devis = (
        round(sum(float(d.get("total_ttc") or 0) for d in all_devis) / len(all_devis), 2) if all_devis else 0.0
    )

    factures_impayees = await db.factures.find(
        {"user_id": user["id"], "statut": {"$in": ["emise", "partiellement_payee"]}}
    ).to_list(200)
    montant_impaye = sum(float(f.get("total_ttc") or 0) - float(f.get("montant_paye") or 0) for f in factures_impayees)

    monthly = []
    for i in range(5, -1, -1):
        y, mo = now.year, now.month - i
        while mo < 1:
            mo += 12
            y -= 1
        while mo > 12:
            mo -= 12
            y += 1
        ms = _utc_month_start(y, mo)
        me = _utc_month_end_exclusive(y, mo)
        label = f"{y}-{str(mo).zfill(2)}"
        monthly.append(
            {"mois": label, "ca": round(_devis_ca_accepte_facture_dans_mois(all_devis, ms, me), 2)}
        )

    pie = [
        {"name": "Brouillon", "value": len([d for d in all_devis if d.get("statut") == "brouillon"])},
        {"name": "Envoyé", "value": devis_envoyes},
        {"name": "Accepté", "value": devis_acceptes},
        {"name": "Refusé", "value": devis_refuses},
        {
            "name": "Autre",
            "value": len(
                [
                    d
                    for d in all_devis
                    if d.get("statut") not in ("brouillon", "envoye", "accepte", "refuse", "facture")
                ]
            ),
        },
    ]
    pie = [p for p in pie if p["value"] > 0]

    return {
        "caMois": ca_mois,
        "caMoisPrec": ca_mois_prec,
        "devisCrees": devis_crees,
        "devisEnvoyes": devis_envoyes,
        "devisAcceptes": devis_acceptes,
        "devisRefuses": devis_refuses,
        "montantMoyenDevis": montant_moyen_devis,
        "impayes": round(montant_impaye, 2),
        "monthly": monthly,
        "pie": pie if pie else [{"name": "Aucun", "value": 1}],
    }


# ─── AI ENDPOINTS ─────────────────────────────────────────────────
@api.post("/ai/generate-devis")
async def ai_generate_devis(input: AIGenerateInput, user=Depends(get_current_user)):
    raise HTTPException(
        status_code=501,
        detail="IA désactivée : la dépendance emergentintegrations n'est pas installable. (On pourra la remplacer par OpenAI direct ensuite.)",
    )

@api.post("/ai/chat")
async def ai_chat(input: AIChatInput, user=Depends(get_current_user)):
    raise HTTPException(
        status_code=501,
        detail="IA désactivée : la dépendance emergentintegrations n'est pas installable. (On pourra la remplacer par OpenAI direct ensuite.)",
    )

# ─── STARTUP ──────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    # Fail fast si MongoDB n'est pas joignable (sinon le serveur reste bloqué au démarrage).
    try:
        await client.admin.command("ping")
    except Exception as e:
        raise RuntimeError(
            "MongoDB injoignable. Lance MongoDB (local ou Docker) ou configure MONGO_URL vers Atlas. "
            f"Détail: {e}"
        ) from e

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.profiles.create_index("user_id")
    await db.clients.create_index([("user_id", 1), ("nom", 1)])
    await db.devis.create_index([("user_id", 1), ("created_at", -1)])
    await db.ouvrages.create_index([("user_id", 1), ("nom", 1)])
    await db.factures.create_index([("user_id", 1), ("created_at", -1)])
    await db.chantiers.create_index([("user_id", 1), ("due_date", 1)])

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@plombicrm.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        result = await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "nom": "",
            "prenom": "",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        await db.profiles.insert_one({
            "user_id": str(result.inserted_id),
            "entreprise": "Flowo Admin",
            "siret": "",
            "adresse": "",
            "tel": "",
            "email_facturation": admin_email,
            "logo_url": "",
            "tva_defaut": 10,
            "sep_fourniture_pose": False,
            "structure_devis": "libre",
            "mention_legale": "",
            "conditions_paiement": "Paiement à 30 jours",
            "onboarding_step": 3,
            "onboarding_complete": True,
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")

    logger.info("Flowo backend started!")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)
