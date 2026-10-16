import urllib.request
import urllib.error
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode("utf-8")
            return status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"detail": body}
        return status, parsed

def test_auth_live():
    print("=== LIVE AUTHENTICATION TEST ===")

    # 1. Health check
    status, body = make_request("http://127.0.0.1:8000/api/health")
    assert status == 200, f"Health check failed: {body}"
    print(" [PASS] Server is healthy and reachable.")

    # 2. Test Sign Up (Registration)
    unique_email = f"debater_{uuid.uuid4().hex[:6]}@debateiq.ai"
    reg_payload = {
        "email": unique_email,
        "password": "secure_password_123",
        "full_name": "Jordan Peterson",
        "role": "Learner"
    }
    status, reg_data = make_request(f"{BASE_URL}/auth/register", method="POST", data=reg_payload)
    assert status == 201, f"Registration failed with status {status}: {reg_data}"
    assert "access_token" in reg_data, "No access token in registration response"
    assert "refresh_token" in reg_data, "No refresh token in registration response"
    print(f" [PASS] Sign Up succeeded for {unique_email} (Status 201 Created)")

    # 3. Test Duplicate Sign Up (Must fail with 400)
    status, dup_data = make_request(f"{BASE_URL}/auth/register", method="POST", data=reg_payload)
    assert status == 400, f"Duplicate registration did not fail with 400: {status} {dup_data}"
    print(" [PASS] Duplicate email registration properly rejected with 400 Bad Request")

    # 4. Test Sign In with correct credentials
    login_payload = {
        "email": unique_email,
        "password": "secure_password_123"
    }
    status, login_data = make_request(f"{BASE_URL}/auth/login", method="POST", data=login_payload)
    assert status == 200, f"Login failed: {status} {login_data}"
    token = login_data["access_token"]
    refresh_tok = login_data["refresh_token"]
    print(" [PASS] Sign In succeeded with valid credentials (Status 200 OK)")

    # 5. Test Sign In with invalid password (Must fail with 401)
    status, bad_login_data = make_request(f"{BASE_URL}/auth/login", method="POST", data={"email": unique_email, "password": "wrong_password"})
    assert status == 401, f"Bad password did not return 401: {status} {bad_login_data}"
    print(" [PASS] Sign In rejected for incorrect password with 401 Unauthorized")

    # 6. Test Protected Endpoint /auth/me with Bearer token
    headers = {"Authorization": f"Bearer {token}"}
    status, me_data = make_request(f"{BASE_URL}/auth/me", headers=headers)
    assert status == 200, f"Failed to get /auth/me: {status} {me_data}"
    assert me_data["email"] == unique_email
    assert me_data["full_name"] == "Jordan Peterson"
    print(f" [PASS] Protected /auth/me endpoint verified identity for {me_data['full_name']}")

    # 7. Test Refresh Token
    status, ref_data = make_request(f"{BASE_URL}/auth/refresh", method="POST", data={"refresh_token": refresh_tok})
    assert status == 200, f"Refresh token failed: {status} {ref_data}"
    assert "access_token" in ref_data
    print(" [PASS] Refresh token successfully issued new access token")

    # 8. Test Demo Persona Logins
    for demo in ["learner@debateiq.ai", "coach@debateiq.ai", "educator@debateiq.ai", "admin@debateiq.ai"]:
        status, d_data = make_request(f"{BASE_URL}/auth/login", method="POST", data={"email": demo, "password": "password123"})
        assert status == 200, f"Demo login failed for {demo}: {status} {d_data}"
        print(f" [PASS] Demo login verified for {demo} (Token issued)")

    print("\n>>> ALL SIGN IN & SIGN UP TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL. <<<")

if __name__ == "__main__":
    test_auth_live()
