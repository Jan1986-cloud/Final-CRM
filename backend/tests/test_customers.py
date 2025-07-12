import json
import uuid
from src.models.database import Customer, User

def test_customer_create_success(client, db_session, auth_headers):
    """
    GIVEN a logged-in user with 'admin' role
    WHEN a POST request is made to /api/customers with a valid payload
    THEN a 201 status code should be returned with the new customer's ID
    """
    headers = auth_headers('admin')
    payload = {
        "company_name": "Nieuwe Klant B.V.",
        "contact_person": "Jan Jansen",
        "email": "jan@nieuweklant.nl",
        "phone": "0612345678"
    }
    response = client.post('/api/customers/', headers=headers, data=json.dumps(payload), content_type='application/json')
    
    assert response.status_code == 201
    data = response.get_json()
    assert 'customer_id' in data
    
    # Verify the customer was actually created in the database
    customer_id = data['customer_id']
    customer = db_session.query(Customer).get(customer_id)
    assert customer is not None
    assert customer.company_name == "Nieuwe Klant B.V."

def test_customer_create_invalid_payload(client, db_session, auth_headers):
    """
    GIVEN a logged-in user with 'admin' role
    WHEN a POST request is made to /api/customers with an invalid payload (missing company_name)
    THEN a 400 status code should be returned with a validation error
    """
    headers = auth_headers('admin')
    payload = {
        "company_name": "", # Invalid: cannot be empty
        "contact_person": "Piet Pietersen",
        "email": "piet@invalid.com"
    }
    response = client.post('/api/customers/', headers=headers, data=json.dumps(payload), content_type='application/json')
    
    assert response.status_code == 400
    data = response.get_json()
    assert 'errors' in data
    assert 'company_name' in data['errors']
    assert 'length must be between' in data['errors']['company_name'][0].lower()

def test_customer_delete_forbidden_for_technician(client, db_session, auth_headers):
    """
    GIVEN a logged-in user with 'technician' role
    WHEN a DELETE request is made to /api/customers/{id}
    THEN a 403 status code should be returned
    """
    # Step 1: Create a customer as an admin first
    admin_headers = auth_headers('admin')
    customer = Customer(company_name="Te Verwijderen Klant", company_id=User.query.first().company_id)
    db_session.add(customer)
    db_session.commit()
    
    # Step 2: Try to delete the customer as a technician
    technician_headers = auth_headers('technician')
    response = client.delete(f'/api/customers/{customer.id}', headers=technician_headers)
    
    assert response.status_code == 403
    data = response.get_json()
    assert 'Access forbidden' in data['error']
    
    # Verify the customer was not deleted
    retrieved_customer = db_session.query(Customer).get(customer.id)
    assert retrieved_customer is not None
    assert retrieved_customer.is_active is True