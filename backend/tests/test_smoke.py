"""Tests API (auth + ressource) — nécessitent MongoDB joignable (service CI ou .env local)."""

from __future__ import annotations

import uuid

import pytest
from starlette.testclient import TestClient


@pytest.fixture(scope="module")
def client() -> TestClient:
    from server import app

    with TestClient(app) as c:
        yield c


def test_openapi_docs(client: TestClient) -> None:
    r = client.get("/docs")
    assert r.status_code == 200


def test_register_me_chantiers(client: TestClient) -> None:
    email = f"ci_{uuid.uuid4().hex}@flowo.test"
    body = {
        "email": email,
        "password": "s3cure-Test-Pass",
        "nom": "Test",
        "prenom": "CI",
        "tel": "0612345678",
        "entreprise": "Entreprise Test",
        "metier": "plombier",
        "siret": "12345678901234",
        "adresse": "1 rue de Test, 75001 Paris",
    }
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    token = data.get("token")
    assert token

    h = {"Authorization": f"Bearer {token}"}
    me = client.get("/api/auth/me", headers=h)
    assert me.status_code == 200, me.text
    assert me.json()["email"] == email

    ch = client.get("/api/chantiers", headers=h)
    assert ch.status_code == 200, ch.text
    assert isinstance(ch.json(), list)

    ch_f = client.get("/api/chantiers?client_id=507f1f77bcf86cd799439011", headers=h)
    assert ch_f.status_code == 200, ch_f.text
    assert isinstance(ch_f.json(), list)

    pub = client.get("/api/public/factures/00000000-0000-0000-0000-000000000000")
    assert pub.status_code == 404


def test_devis_public_token(client: TestClient) -> None:
    email = f"ci_{uuid.uuid4().hex}@flowo.test"
    body = {
        "email": email,
        "password": "s3cure-Test-Pass",
        "nom": "Test",
        "prenom": "CI",
        "tel": "0612345678",
        "entreprise": "Entreprise Test",
        "metier": "plombier",
        "siret": "12345678901234",
        "adresse": "1 rue de Test, 75001 Paris",
    }
    r = client.post("/api/auth/register", json=body)
    assert r.status_code == 200, r.text
    token = r.json().get("token")
    assert token
    h = {"Authorization": f"Bearer {token}"}

    devis = client.post(
        "/api/devis",
        headers=h,
        json={"client_id": None, "notes": "", "lignes": [{"designation": "Test", "quantite": 1, "prix_ht": 100, "tva": 10}]},
    )
    assert devis.status_code == 200, devis.text
    devis_id = devis.json().get("id")
    public_token = devis.json().get("public_token")
    assert devis_id
    assert public_token

    pub = client.get(f"/api/public/devis/{public_token}")
    assert pub.status_code == 200, pub.text
    assert pub.json().get("numero")

    missing = client.get("/api/public/devis/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404
