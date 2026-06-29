def test_messages_unauthorized(client):
    resp = client.get("/api/messages/contacts")
    assert resp.status_code == 401


def test_messages_contacts(client, auth_headers):
    resp = client.get("/api/messages/contacts", headers=auth_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
