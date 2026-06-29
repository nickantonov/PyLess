def test_profile_guest(client):
    resp = client.get("/api/profile/me")
    assert resp.status_code == 200
    data = resp.json()
    assert "level" in data
    assert "total_completed" in data


def test_profile_auth(client, auth_headers):
    resp = client.get("/api/profile/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "level" in data
    assert "streak" in data


def test_settings_public(client):
    resp = client.get("/api/settings/site_name")
    assert resp.status_code == 200
    data = resp.json()
    assert data["key"] == "site_name"


def test_settings_requires_auth(client):
    resp = client.get("/api/settings/")
    assert resp.status_code in (401, 403, 422)


def test_settings_admin(client, auth_headers):
    resp = client.get("/api/settings/", headers=auth_headers)
    assert resp.status_code in (200, 401, 403)
