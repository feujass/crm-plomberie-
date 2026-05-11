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

from conformite import (
    chorus_export_payload,
    classify_client_branche,
    default_b2b_mentions_footer,
    ereporting_transaction_snapshot,
    pdp_einvoice_snapshot,
    simulation_status_for_env,
    transmission_kinds_for_branche,
    validate_facture_emission,
)

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


def _iso_date(val):
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    return val


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


def _pdp_simulate() -> bool:
    return os.environ.get("PDP_SIMULATE", "true").lower() in ("1", "true", "yes")


def _pdp_configured() -> bool:
    return bool(os.environ.get("PDP_API_URL", "").strip() and os.environ.get("PDP_API_KEY", "").strip())


async def audit_log(
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    payload: Optional[dict] = None,
):
    await db.audit_events.insert_one(
        {
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "payload": payload or {},
            "created_at": datetime.now(timezone.utc),
        }
    )


async def create_transmissions_for_facture(user_id: str, facture_id: str, facture_doc: dict, branche: str):
    """Crée les enregistrements de transmission (PDP / Chorus) — simulation ou pending selon env."""
    kinds = transmission_kinds_for_branche(branche)
    status, msg = simulation_status_for_env(_pdp_simulate(), _pdp_configured())
    now = datetime.now(timezone.utc)
    prof = await db.profiles.find_one({"user_id": user_id})
    cli = None
    cid = facture_doc.get("client_id")
    if cid:
        try:
            cli = await db.clients.find_one({"_id": ObjectId(str(cid)), "user_id": user_id})
        except Exception:
            cli = None
    prof_s = serialize_doc(dict(prof)) if prof else None
    cli_s = serialize_doc(dict(cli)) if cli else None
    fd = {**facture_doc, "id": facture_id}
    for kind in kinds:
        if kind == "pdp_einvoicing":
            snap = pdp_einvoice_snapshot(fd, prof_s, cli_s)
        elif kind == "pdp_ereporting":
            snap = ereporting_transaction_snapshot(fd, cli_s)
        elif kind == "chorus_pro":
            snap = chorus_export_payload(fd, prof_s, cli_s)
        else:
            snap = {"kind": kind}
        doc = {
            "user_id": user_id,
            "facture_id": facture_id,
            "kind": kind,
            "status": status,
            "detail": msg,
            "payload_snapshot": snap,
            "provider_ref": f"stub-{uuid.uuid4()}" if status == "simulated_ok" else None,
            "created_at": now,
            "updated_at": now,
        }
        await db.transmissions.insert_one(doc)


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
    siren: Optional[str] = None
    forme_juridique: Optional[str] = None
    capital_social: Optional[str] = None
    rcs_ville: Optional[str] = None
    numero_tva_intracom: Optional[str] = None
    tva_sur_encaissements: Optional[bool] = None
    tva_sur_debits_opt_in: Optional[bool] = None
    decennale_mention: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None
    adresse: Optional[str] = None
    tel: Optional[str] = None
    email_facturation: Optional[str] = None
    logo_url: Optional[str] = None
    avatar_url: Optional[str] = None
    specialites: Optional[str] = None
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
    feature_flag_pdp: Optional[bool] = None
    feature_flag_ereporting: Optional[bool] = None
    feature_flag_chorus: Optional[bool] = None
    feature_flag_esign_advanced: Optional[bool] = None

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
    siren: Optional[str] = ""
    tva_intracom: Optional[str] = ""
    categorie_fiscale: Optional[str] = None
    """particulier | pro_assujetti | pro_non_assujetti | pro_international"""
    secteur_public: Optional[bool] = False
    chorus_service_code: Optional[str] = ""
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
    adresse_chantier: Optional[str] = None
    lignes: Optional[List[DevisLineInput]] = []

class DevisUpdateInput(BaseModel):
    client_id: Optional[str] = None
    statut: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    date_expiration: Optional[str] = None
    remise_type: Optional[str] = None
    remise_valeur: Optional[float] = None
    adresse_chantier: Optional[str] = None
    esign_provider: Optional[str] = None
    esign_envelope_id: Optional[str] = None
    esign_status: Optional[str] = None
    esign_signed_at: Optional[str] = None
    esign_proof: Optional[dict] = None


class InternalNoteAppendInput(BaseModel):
    text: str

class PaiementInput(BaseModel):
    montant: float
    date: Optional[str] = None
    mode: Optional[str] = "virement"


class FactureFromDevisOptions(BaseModel):
    """Options conformité lors de la création facture depuis devis."""

    operations_type: Optional[str] = "services"
    adresse_livraison_chantier: Optional[str] = None
    date_prestation_debut: Optional[str] = None
    date_prestation_fin: Optional[str] = None
    facture_type: Optional[str] = "standard"
    """standard | acompte | situation | solde | avoir"""
    chorus_service_code: Optional[str] = None


class DevisEsignStubInput(BaseModel):
    """Stub signature avancée — à brancher sur Yousign / DocuSign (webhook + API)."""

    action: str = "init"
    """init | mark_signed (recette interne) | reset"""

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
        "siren": "",
        "adresse": "",
        "tel": "",
        "email_facturation": email,
        "logo_url": "",
        "tva_defaut": 10,
        "sep_fourniture_pose": False,
        "structure_devis": "libre",
        "mention_legale": default_b2b_mentions_footer(),
        "conditions_paiement": "Paiement à 30 jours",
        "onboarding_step": 0,
        "onboarding_complete": False,
        "tva_sur_encaissements": True,
        "tva_sur_debits_opt_in": False,
        "feature_flag_pdp": True,
        "feature_flag_ereporting": True,
        "feature_flag_chorus": True,
        "feature_flag_esign_advanced": True,
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
async def list_chantiers(
    user=Depends(get_current_user),
    search: str = "",
    status: str = "",
    client_id: str = "",
):
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    if client_id.strip():
        query["client_id"] = client_id.strip()
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
    if not doc.get("categorie_fiscale"):
        doc["categorie_fiscale"] = (
            "particulier" if str(doc.get("type") or "").lower() == "particulier" else "pro_assujetti"
        )
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
        "adresse_chantier": (input.adresse_chantier or "").strip(),
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
async def create_facture_from_devis(
    devis_id: str,
    body: FactureFromDevisOptions = FactureFromDevisOptions(),
    user=Depends(get_current_user),
):
    d = await db.devis.find_one({"_id": ObjectId(devis_id), "user_id": user["id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    numero = await get_next_facture_number(user["id"])
    cli = None
    cid = d.get("client_id")
    if cid:
        try:
            cli = await db.clients.find_one({"_id": ObjectId(str(cid)), "user_id": user["id"]})
        except Exception:
            cli = None
    prof = await db.profiles.find_one({"user_id": user["id"]})
    cli_flat = serialize_doc(dict(cli)) if cli else None
    prof_flat = serialize_doc(dict(prof)) if prof else None
    branche = classify_client_branche(cli_flat)
    adresse_liv = (body.adresse_livraison_chantier or "").strip() or (d.get("adresse_chantier") or "").strip()
    if not adresse_liv and cli_flat:
        adresse_liv = (cli_flat.get("adresse") or "").strip()
    chorus_code = (body.chorus_service_code or "").strip() or (cli_flat or {}).get("chorus_service_code") or ""
    now = datetime.now(timezone.utc)
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
        "date_emission": now,
        "date_echeance": (now + timedelta(days=30)),
        "paiements": [],
        "montant_paye": 0,
        "public_token": str(uuid.uuid4()),
        "created_at": now,
        "operations_type": body.operations_type or "services",
        "facture_type": body.facture_type or "standard",
        "adresse_livraison_chantier": adresse_liv,
        "date_prestation_debut": body.date_prestation_debut,
        "date_prestation_fin": body.date_prestation_fin,
        "conformite_branche": branche,
        "chorus_service_code": chorus_code,
        "immutable": True,
        "locked_at": now,
    }
    pre_val = {**facture_doc, "numero": numero}
    facture_doc["conformite_warnings"] = validate_facture_emission(pre_val, prof_flat, cli_flat)
    result = await db.factures.insert_one(facture_doc)
    fid = str(result.inserted_id)
    stored = await db.factures.find_one({"_id": result.inserted_id})
    out = serialize_doc(stored)
    await create_transmissions_for_facture(user["id"], fid, out, branche)
    await audit_log(
        user["id"],
        "facture.created",
        "facture",
        fid,
        {"branche": branche, "numero": numero, "warnings": facture_doc.get("conformite_warnings") or []},
    )
    # Update devis status
    await db.devis.update_one({"_id": ObjectId(devis_id)}, {"$set": {"statut": "facture"}})
    return out

@api.get("/factures/{facture_id}")
async def get_facture(facture_id: str, user=Depends(get_current_user)):
    f = await db.factures.find_one({"_id": ObjectId(facture_id), "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    if not f.get("public_token"):
        tok = str(uuid.uuid4())
        await db.factures.update_one({"_id": ObjectId(facture_id)}, {"$set": {"public_token": tok}})
        f["public_token"] = tok
    return serialize_doc(f)


@api.get("/public/factures/{public_token}")
async def get_public_facture(public_token: str):
    """Consultation sans compte : lien partagé (UUID non devinable)."""
    f = await db.factures.find_one({"public_token": public_token.strip()})
    if not f:
        raise HTTPException(status_code=404, detail="Facture introuvable")
    return {
        "numero": f.get("numero"),
        "client_nom": f.get("client_nom"),
        "statut": f.get("statut"),
        "lignes": f.get("lignes", []),
        "total_ht": f.get("total_ht"),
        "total_tva": f.get("total_tva"),
        "total_ttc": f.get("total_ttc"),
        "notes": f.get("notes"),
        "date_emission": _iso_date(f.get("date_emission")),
        "date_echeance": _iso_date(f.get("date_echeance")),
    }

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
    await audit_log(
        user["id"],
        "facture.paiement",
        "facture",
        facture_id,
        {"montant": input.montant, "mode": input.mode},
    )
    return serialize_doc(updated)


@api.get("/factures/{facture_id}/transmissions")
async def list_facture_transmissions(facture_id: str, user=Depends(get_current_user)):
    f = await db.factures.find_one({"_id": ObjectId(facture_id), "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    rows = await db.transmissions.find({"user_id": user["id"], "facture_id": facture_id}).sort("created_at", -1).to_list(
        100
    )
    return [serialize_doc(t) for t in rows]


@api.get("/factures/{facture_id}/chorus-export")
async def export_facture_chorus(facture_id: str, user=Depends(get_current_user)):
    f = await db.factures.find_one({"_id": ObjectId(facture_id), "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    prof = await db.profiles.find_one({"user_id": user["id"]})
    cli = None
    if f.get("client_id"):
        try:
            cli = await db.clients.find_one({"_id": ObjectId(str(f["client_id"])), "user_id": user["id"]})
        except Exception:
            cli = None
    payload = chorus_export_payload(
        serialize_doc(dict(f)),
        serialize_doc(dict(prof)) if prof else None,
        serialize_doc(dict(cli)) if cli else None,
    )
    return payload


@api.post("/factures/{facture_id}/transmissions/retry")
async def retry_facture_transmissions(facture_id: str, user=Depends(get_current_user)):
    f = await db.factures.find_one({"_id": ObjectId(facture_id), "user_id": user["id"]})
    if not f:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    branche = f.get("conformite_branche")
    cli = None
    if f.get("client_id"):
        try:
            cli = await db.clients.find_one({"_id": ObjectId(str(f["client_id"])), "user_id": user["id"]})
        except Exception:
            cli = None
    if not branche:
        branche = classify_client_branche(serialize_doc(dict(cli)) if cli else None)
    await db.transmissions.delete_many({"user_id": user["id"], "facture_id": facture_id})
    ins = serialize_doc(dict(f))
    await create_transmissions_for_facture(user["id"], facture_id, ins, branche)
    await audit_log(user["id"], "facture.transmissions_retry", "facture", facture_id, {"branche": branche})
    rows = await db.transmissions.find({"user_id": user["id"], "facture_id": facture_id}).sort("created_at", -1).to_list(
        100
    )
    return [serialize_doc(t) for t in rows]


@api.get("/conformite/transmissions")
async def list_all_transmissions(user=Depends(get_current_user), limit: int = 80):
    lim = max(1, min(limit, 200))
    rows = await db.transmissions.find({"user_id": user["id"]}).sort("created_at", -1).to_list(lim)
    return [serialize_doc(t) for t in rows]


@api.get("/conformite/audit")
async def list_audit_events(user=Depends(get_current_user), limit: int = 100):
    lim = max(1, min(limit, 300))
    rows = await db.audit_events.find({"user_id": user["id"]}).sort("created_at", -1).to_list(lim)
    return [serialize_doc(t) for t in rows]


@api.get("/conformite/archive")
async def conformite_archive_export(user=Depends(get_current_user), date_from: str = "", date_to: str = ""):
    """Export JSON agrégé (archivage / preuve) — filtre optionnel sur date_emission des factures (YYYY-MM-DD)."""
    factures = await db.factures.find({"user_id": user["id"]}).sort("created_at", -1).to_list(2000)

    def _emission_day(doc) -> str:
        de = doc.get("date_emission")
        if de is None:
            return ""
        if isinstance(de, datetime):
            return de.date().isoformat()
        s = str(de)
        return s[:10] if len(s) >= 10 else s

    if date_from or date_to:

        def _keep_emission(doc) -> bool:
            d = _emission_day(doc)
            if date_from and d and d < date_from:
                return False
            if date_to and d and d > date_to:
                return False
            return True

        factures = [x for x in factures if _keep_emission(x)]
    fids = [str(x["_id"]) for x in factures]
    trans = (
        await db.transmissions.find({"user_id": user["id"], "facture_id": {"$in": fids}}).to_list(10000)
        if fids
        else []
    )
    audits = await db.audit_events.find({"user_id": user["id"]}).sort("created_at", -1).to_list(5000)
    devis = await db.devis.find({"user_id": user["id"]}).sort("created_at", -1).to_list(2000)
    return {
        "format": "flowo.conformite_archive.v1",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "filtre": {"date_from": date_from or None, "date_to": date_to or None},
        "factures": [serialize_doc(x) for x in factures],
        "transmissions": [serialize_doc(x) for x in trans],
        "audit_events": [serialize_doc(x) for x in audits],
        "devis": [serialize_doc(x) for x in devis],
    }


@api.put("/devis/{devis_id}/esign-stub")
async def devis_esign_stub(devis_id: str, body: DevisEsignStubInput, user=Depends(get_current_user)):
    d = await db.devis.find_one({"_id": ObjectId(devis_id), "user_id": user["id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    now = datetime.now(timezone.utc).isoformat()
    if body.action == "init":
        env_id = str(uuid.uuid4())
        patch = {
            "esign_provider": "advanced_stub",
            "esign_envelope_id": env_id,
            "esign_status": "pending_signature",
            "esign_proof": {"init_at": now, "note": "Remplacez par intégration Yousign/DocuSign (eIDAS)."},
        }
    elif body.action == "mark_signed":
        patch = {
            "esign_status": "signed",
            "esign_signed_at": now,
            "esign_proof": {"completed_via": "stub", "signed_at": now},
        }
    elif body.action == "reset":
        patch = {
            "esign_provider": None,
            "esign_envelope_id": None,
            "esign_status": None,
            "esign_signed_at": None,
            "esign_proof": None,
        }
    else:
        raise HTTPException(status_code=400, detail="action invalide (init | mark_signed | reset)")
    await db.devis.update_one({"_id": ObjectId(devis_id), "user_id": user["id"]}, {"$set": patch})
    await audit_log(user["id"], f"devis.esign.{body.action}", "devis", devis_id, patch)
    rd = await db.devis.find_one({"_id": ObjectId(devis_id)})
    return serialize_doc(rd)


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
    await db.factures.create_index("public_token", unique=True, sparse=True)
    await db.chantiers.create_index([("user_id", 1), ("due_date", 1)])
    await db.audit_events.create_index([("user_id", 1), ("created_at", -1)])
    await db.transmissions.create_index([("user_id", 1), ("created_at", -1)])
    await db.transmissions.create_index([("user_id", 1), ("facture_id", 1)])

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
            "siren": "",
            "adresse": "",
            "tel": "",
            "email_facturation": admin_email,
            "logo_url": "",
            "tva_defaut": 10,
            "sep_fourniture_pose": False,
            "structure_devis": "libre",
            "mention_legale": default_b2b_mentions_footer(),
            "conditions_paiement": "Paiement à 30 jours",
            "onboarding_step": 3,
            "onboarding_complete": True,
            "tva_sur_encaissements": True,
            "tva_sur_debits_opt_in": False,
            "feature_flag_pdp": True,
            "feature_flag_ereporting": True,
            "feature_flag_chorus": True,
            "feature_flag_esign_advanced": True,
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
