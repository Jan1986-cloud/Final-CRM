#!/usr/bin/env python3
"""
fix_and_test_customers.py

Test and demonstrate the trailing slash behavior on the /api/customers endpoint.
Run this script inside the backend Docker container (WORKDIR /app).
"""

import sys

from src.main import create_app


def main():
    app = create_app()
    client = app.test_client()

    print("1) Logging in as admin@bedrijf.nl / admin123...")
    login_resp = client.post(
        '/api/auth/login',
        json={'email': 'admin@bedrijf.nl', 'password': 'admin123'}
    )
    print(f"   Status: {login_resp.status_code}, Body: {login_resp.json}")
    if login_resp.status_code != 200 or 'token' not in login_resp.json:
        print("ERROR: Login failed, cannot continue tests.")
        sys.exit(1)

    token = login_resp.json['token']
    headers = {'Authorization': f'Bearer {token}'}

    # Test incorrect endpoint (no trailing slash)
    print("\n2) GET /api/customers (no slash) -> expecting 308 redirect")
    resp = client.get('/api/customers', headers=headers)
    print(f"   Status: {resp.status_code}, Location: {resp.headers.get('Location')}\n")

    # Test correct endpoint (with trailing slash)
    print("3) GET /api/customers/ (with slash) -> expecting 200 and list")
    resp_ok = client.get('/api/customers/', headers=headers)
    print(f"   Status: {resp_ok.status_code}, Body: {resp_ok.json}\n")
    customers_before = resp_ok.json.get('customers', [])
    count_before = len(customers_before)
    print(f"   Customers count before POST: {count_before}\n")

    # Test creating a new customer
    print("4) POST /api/customers/ (with slash) -> create TestCo customer")
    new_data = {'company_name': 'TestCo', 'email': 'testco@example.com'}
    post_resp = client.post('/api/customers/', json=new_data, headers=headers)
    print(f"   Status: {post_resp.status_code}, Body: {post_resp.json}\n")
    if post_resp.status_code not in (200, 201):
        print("ERROR: Creating customer failed, terminating.")
        sys.exit(1)

    # Verify new count
    print("5) GET /api/customers/ again to verify count increased")
    resp_after = client.get('/api/customers/', headers=headers)
    customers_after = resp_after.json.get('customers', [])
    count_after = len(customers_after)
    print(f"   Customers count after POST: {count_after}\n")

    if count_after == count_before + 1:
        print("SUCCESS: Customer creation verified, API behaves correctly with trailing slash.")
    else:
        print("ERROR: Customer count did not increase as expected.")


if __name__ == '__main__':
    main()