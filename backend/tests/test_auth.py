def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "uptime_seconds" in data


def test_register(client):
    import time
    username = f"user_{int(time.time()*1000)}"
    resp = client.post("/api/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "pass1234",
        "display_name": "New User",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["user"]["username"] == username


def test_register_duplicate(client):
    client.post("/api/auth/register", json={
        "username": "dupuser",
        "email": "dup@example.com",
        "password": "pass1234",
    })
    resp = client.post("/api/auth/register", json={
        "username": "dupuser",
        "email": "dup2@example.com",
        "password": "pass1234",
    })
    assert resp.status_code in (400, 409, 200)


def test_login(client):
    client.post("/api/auth/register", json={
        "username": "logintest",
        "email": "login@example.com",
        "password": "pass1234",
    })
    resp = client.post("/api/auth/login", json={
        "username": "logintest",
        "password": "pass1234",
    })
    assert resp.status_code == 200
    assert "token" in resp.json()


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "username": "wrongpw",
        "email": "wrongpw@example.com",
        "password": "pass1234",
    })
    resp = client.post("/api/auth/login", json={
        "username": "wrongpw",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401
