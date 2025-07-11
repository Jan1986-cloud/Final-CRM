import requests
import json

url = "https://final-crm-front-production.up.railway.app/api/auth/register"

payload = {
    "username": "admin",
    "email": "admin@bedrijf.nl",
    "password": "admin123",
    "first_name": "Admin",
    "last_name": "User",
    "company_name": "Admin Company"
}

headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
    print("Registration successful!")
    print("Response:", response.json())
except requests.exceptions.HTTPError as errh:
    print(f"Http Error: {errh}")
    print("Response Body:", response.text)
except requests.exceptions.ConnectionError as errc:
    print(f"Error Connecting: {errc}")
except requests.exceptions.Timeout as errt:
    print(f"Timeout Error: {errt}")
except requests.exceptions.RequestException as err:
    print(f"Something else went wrong: {err}")

