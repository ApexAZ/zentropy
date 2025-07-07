import requests
import json

data = {
    "first_name": "Test",
    "last_name": "User", 
    "email": "test@example.com",
    "organization": "",
    "password": "Password123",
    "terms_agreement": True,
    "has_projects_access": True
}

print("Testing registration endpoint...")

try:
    response = requests.post('http://localhost:3000/api/v1/auth/register', json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
