from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    with TestClient(app) as client:
        # 1. Health
        res = client.get("/api/health")
        print("1. Health Check:", res.status_code, res.json())
        assert res.status_code == 200

        # 2. Login as Admin
        res = client.post("/api/auth/login", json={"email": "admin@justitalk.com", "password": "password123"})
        print("2. Login Check:", res.status_code)
        assert res.status_code == 200
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Dashboard Analytics
        res = client.get("/api/analytics/dashboard", headers=headers)
        print("3. Dashboard Analytics:", res.status_code, "Total Debates:", res.json().get("total_debates"))
        assert res.status_code == 200
        assert res.json()["total_debates"] == 7

        # 4. Argument Analysis
        res = client.post(
            "/api/arguments/analyze",
            json={"argument": "Autonomous AI judges will eliminate judicial backlog and sentencing disparities."},
            headers=headers
        )
        print("4. Argument Analysis:", res.status_code, "Overall Score:", res.json().get("overall_score"))
        assert res.status_code == 200

        # 5. Fallacy Detection
        res = client.post(
            "/api/fallacies/detect",
            json={"text": "You are a corrupt idiot and nobody should listen to your ideas."},
            headers=headers
        )
        print("5. Fallacy Detection:", res.status_code, "Detected:", [f["name"] for f in res.json().get("fallacies", [])])
        assert res.status_code == 200

        # 6. Counterarguments
        res = client.post(
            "/api/counterarguments/generate",
            json={"argument": "We should abolish all space exploration programs immediately."},
            headers=headers
        )
        print("6. Counterargument Generation:", res.status_code, "Rebuttals generated:", len(res.json().get("logical_rebuttals", [])))
        assert res.status_code == 200

        print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
