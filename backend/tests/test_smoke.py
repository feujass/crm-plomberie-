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
