import requests
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"

def print_result(name, res):
    if res.status_code in [200, 201]:
        print(f"✅ [PASS] {name}")
    else:
        print(f"❌ [FAIL] {name} - Status: {res.status_code}")
        print(res.text)

def run_tests():
    print("Starting API Tests...\n")
    
    # 1. Test Auth (Register & Login)
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "securepassword123"
    
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "password": test_password,
        "role": "learner"
    })
    print_result("Auth - Register User", res)
    
    res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": test_email,
        "password": test_password
    })
    print_result("Auth - Login User", res)
    
    if res.status_code != 200:
        print("Cannot continue without auth token.")
        return
        
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test Users Profile
    res = requests.get(f"{BASE_URL}/users/me", headers=headers)
    print_result("Users - Get Current User", res)
    
    res = requests.get(f"{BASE_URL}/users/me/profile", headers=headers)
    print_result("Users - Get Profile", res)
    
    res = requests.put(f"{BASE_URL}/users/me/profile", headers=headers, json={
        "experience_level": "intermediate",
        "preferred_topics": "AI, Ethics",
        "learning_goals": "Improve logical consistency"
    })
    print_result("Users - Update Profile", res)
    
    # 3. Test Debates Scheduling
    res = requests.post(f"{BASE_URL}/debates/", headers=headers, json={
        "title": "AI Impact on Jobs",
        "format": "One-on-One",
        "status": "scheduled"
    })
    print_result("Debates - Schedule Session", res)
    
    res = requests.get(f"{BASE_URL}/debates/", headers=headers)
    print_result("Debates - List My Sessions", res)
    
    # 4. Test Analysis Engine
    arg_payload = {"text": "AI reduces manual labor and improves efficiency."}
    res = requests.post(f"{BASE_URL}/analysis/analyze", headers=headers, json=arg_payload)
    print_result("Analysis - Analyze Argument", res)
    
    res = requests.post(f"{BASE_URL}/analysis/fallacies", headers=headers, json=arg_payload)
    print_result("Analysis - Detect Fallacies", res)
    
    res = requests.post(f"{BASE_URL}/analysis/counterargument", headers=headers, json=arg_payload)
    print_result("Analysis - Generate Counterargument", res)
    
    # 5. Test Simulation Engine
    res = requests.post(f"{BASE_URL}/simulation/turn", headers=headers, json={
        "history": [{"role": "user", "content": "AI is good."}],
        "difficulty": "hard"
    })
    print_result("Simulation - Multi-turn Opponent", res)
    
    res = requests.post(f"{BASE_URL}/simulation/coach", headers=headers, json={
        "metrics": {"argument_quality": 85, "evidence_usage": 70, "logical_consistency": 90, "rebuttal_effectiveness": 60, "communication_skills": 80}
    })
    print_result("Simulation - Coaching Feedback & Scoring", res)
    
    # 6. Test Presentation Engine (Mock file upload)
    files = {"file": ("test_audio.wav", b"dummy audio data", "audio/wav")}
    res = requests.post(f"{BASE_URL}/presentation/analyze-speech", headers=headers, files=files)
    print_result("Presentation - Analyze Speech", res)
    
    files = {"file": ("test_audio.wav", b"dummy audio data", "audio/wav")}
    res = requests.post(f"{BASE_URL}/presentation/evaluate-delivery", headers=headers, files=files)
    print_result("Presentation - Evaluate Delivery", res)
    
    # 7. Test Reports Export
    res = requests.get(f"{BASE_URL}/reports/export?format=pdf", headers=headers)
    print_result("Reports - Export PDF", res)

if __name__ == "__main__":
    run_tests()
