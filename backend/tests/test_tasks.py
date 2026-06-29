def test_task_list(client):
    resp = client.get("/api/tasks/list")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 50


def test_task_list_has_language(client):
    resp = client.get("/api/tasks/list")
    data = resp.json()
    html_tasks = [t for t in data if t.get("language") == "html"]
    assert len(html_tasks) >= 3


def test_task_detail(client):
    resp = client.get("/api/tasks/list")
    task_id = resp.json()[0]["id"]
    resp = client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == task_id
    assert "starter_code" in data


def test_task_complete(client, auth_headers):
    resp = client.get("/api/tasks/list")
    task_id = resp.json()[0]["id"]
    resp = client.post(f"/api/tasks/{task_id}/complete",
                       headers=auth_headers,
                       json={"best_code": "print('hello')", "elapsed_seconds": 45})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "xp_added" in data


def test_task_fail(client, auth_headers):
    resp = client.get("/api/tasks/list")
    task_id = resp.json()[0]["id"]
    resp = client.post(f"/api/tasks/{task_id}/fail", headers=auth_headers)
    assert resp.status_code == 200


def test_daily_challenge(client):
    resp = client.get("/api/tasks/daily/challenge")
    assert resp.status_code == 200
    data = resp.json()
    assert "task_id" in data
    assert "bonus_xp" in data


def test_leaderboard(client):
    resp = client.get("/api/tasks/leaderboard/top")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
