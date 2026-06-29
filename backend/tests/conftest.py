import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.main import app
from backend.db import init_db, DB_PATH
import tempfile
import shutil


@pytest.fixture(scope="session")
def client():
    tmpdir = tempfile.mkdtemp()
    test_db = os.path.join(tmpdir, "test.db")
    os.environ["DB_DIR"] = tmpdir
    init_db()
    with TestClient(app) as c:
        yield c
    shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.fixture
def auth_headers(client):
    resp = client.post("/api/auth/register", json={
        "username": f"testuser_{os.getpid()}",
        "email": f"test_{os.getpid()}@example.com",
        "password": "testpass123",
        "display_name": "Test User",
    })
    data = resp.json()
    token = data.get("token", "")
    return {"Authorization": f"Bearer {token}"}
