from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, Customer, Location, User
from sqlalchemy import or_

customers_bp = Blueprint('customers', __name__)

def get_user_company_id():
    """Helper function to get current user's company ID"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return user.company_id if user else None

@customers_bp.route('/', methods=['GET'])
@jwt_required()
def get_customers():
    """Get all customers for the company"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        search = request.args.get('search', '')
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        # Build query
        query = Customer.query.filter_by(company_id=company_id)
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        if search:
            search_filter = or_(
                Customer.company_name.ilike(f'%{search}%'),
                Customer.contact_person.ilike(f'%{search}%'),
                Customer.email.ilike(f'%{search}%'),
                Customer.city.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        # Order by company name
        query = query.order_by(Customer.company_name)
        
        # Paginate
        customers = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'customers': [{
                'id': customer.id,
                'company_name': customer.company_name,
                'contact_person': customer.contact_person,
                'email': customer.email,
                'phone': customer.phone,
                'mobile': customer.mobile,
                'address': customer.address,
                'postal_code': customer.postal_code,
                'city': customer.city,
                'country': customer.country,
                'vat_number': customer.vat_number,
                'payment_terms': customer.payment_terms,
                'credit_limit': float(customer.credit_limit) if customer.credit_limit else None,
                'notes': customer.notes,
                'is_active': customer.is_active,
                'created_at': customer.created_at.isoformat(),
                'location_count': len(customer.locations)
            } for customer in customers.items],
            'pagination': {
                'page': customers.page,
                'pages': customers.pages,
                'per_page': customers.per_page,
                'total': customers.total,
                'has_next': customers.has_next,
                'has_prev': customers.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/<customer_id>', methods=['GET'])
@jwt_required()
def get_customer(customer_id):
    """Get specific customer with locations"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        customer = Customer.query.filter_by(
            id=customer_id, company_id=company_id
        ).first()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        return jsonify({
            'customer': {
                'id': customer.id,
                'company_name': customer.company_name,
                'contact_person': customer.contact_person,
                'email': customer.email,
                'phone': customer.phone,
                'mobile': customer.mobile,
                'address': customer.address,
                'postal_code': customer.postal_code,
                'city': customer.city,
                'country': customer.country,
                'vat_number': customer.vat_number,
                'payment_terms': customer.payment_terms,
                'credit_limit': float(customer.credit_limit) if customer.credit_limit else None,
                'notes': customer.notes,
                'is_active': customer.is_active,
                'created_at': customer.created_at.isoformat(),
                'locations': [{
                    'id': location.id,
                    'name': location.name,
                    'address': location.address,
                    'postal_code': location.postal_code,
                    'city': location.city,
                    'country': location.country,
                    'contact_person': location.contact_person,
                    'phone': location.phone,
                    'access_instructions': location.access_instructions,
                    'notes': location.notes,
                    'is_active': location.is_active
                } for location in customer.locations if location.is_active]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/', methods=['POST'])
@jwt_required()
def create_customer():
    """Create new customer"""
    try:
        company_id = get_user_company_id()
        user_id = get_jwt_identity()
        
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('company_name'):
            return jsonify({'error': 'Company name is required'}), 400
        
        # Create customer
        customer = Customer(
            company_id=company_id,
            company_name=data['company_name'],
            contact_person=data.get('contact_person'),
            email=data.get('email'),
            phone=data.get('phone'),
            mobile=data.get('mobile'),
            address=data.get('address'),
            postal_code=data.get('postal_code'),
            city=data.get('city'),
            country=data.get('country', 'Nederland'),
            vat_number=data.get('vat_number'),
            payment_terms=data.get('payment_terms', 30),
            credit_limit=data.get('credit_limit'),
            notes=data.get('notes'),
            created_by=user_id
        )
        
        db.session.add(customer)
        db.session.flush()  # Get customer ID
        
        # Create default location if address provided
        if data.get('address'):
            location = Location(
                customer_id=customer.id,
                name='Hoofdlocatie',
                address=data['address'],
                postal_code=data.get('postal_code'),
                city=data.get('city'),
                country=data.get('country', 'Nederland'),
                contact_person=data.get('contact_person'),
                phone=data.get('phone')
            )
            db.session.add(location)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Customer created successfully',
            'customer_id': customer.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/<customer_id>', methods=['PUT'])
@jwt_required()
def update_customer(customer_id):
    """Update customer"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        customer = Customer.query.filter_by(
            id=customer_id, company_id=company_id
        ).first()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'company_name' in data:
            customer.company_name = data['company_name']
        if 'contact_person' in data:
            customer.contact_person = data['contact_person']
        if 'email' in data:
            customer.email = data['email']
        if 'phone' in data:
            customer.phone = data['phone']
        if 'mobile' in data:
            customer.mobile = data['mobile']
        if 'address' in data:
            customer.address = data['address']
        if 'postal_code' in data:
            customer.postal_code = data['postal_code']
        if 'city' in data:
            customer.city = data['city']
        if 'country' in data:
            customer.country = data['country']
        if 'vat_number' in data:
            customer.vat_number = data['vat_number']
        if 'payment_terms' in data:
            customer.payment_terms = data['payment_terms']
        if 'credit_limit' in data:
            customer.credit_limit = data['credit_limit']
        if 'notes' in data:
            customer.notes = data['notes']
        if 'is_active' in data:
            customer.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({'message': 'Customer updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/<customer_id>', methods=['DELETE'])
@jwt_required()
def delete_customer(customer_id):
    """Soft delete customer (set inactive)"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        customer = Customer.query.filter_by(
            id=customer_id, company_id=company_id
        ).first()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Soft delete - set inactive
        customer.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Customer deactivated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/<customer_id>/locations', methods=['GET'])
@jwt_required()
def get_customer_locations(customer_id):
    """Get all locations for a customer"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        customer = Customer.query.filter_by(
            id=customer_id, company_id=company_id
        ).first()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        locations = Location.query.filter_by(
            customer_id=customer_id, is_active=True
        ).order_by(Location.name).all()
        
        return jsonify({
            'locations': [{
                'id': location.id,
                'name': location.name,
                'address': location.address,
                'postal_code': location.postal_code,
                'city': location.city,
                'country': location.country,
                'contact_person': location.contact_person,
                'phone': location.phone,
                'access_instructions': location.access_instructions,
                'notes': location.notes
            } for location in locations]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/<customer_id>/locations', methods=['POST'])
@jwt_required()
def create_customer_location(customer_id):
    """Create new location for customer"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        customer = Customer.query.filter_by(
            id=customer_id, company_id=company_id
        ).first()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        data = request.get_json()
        
        if not data.get('address'):
            return jsonify({'error': 'Address is required'}), 400
        
        location = Location(
            customer_id=customer_id,
            name=data.get('name', 'Nieuwe locatie'),
            address=data['address'],
            postal_code=data.get('postal_code'),
            city=data.get('city'),
            country=data.get('country', 'Nederland'),
            contact_person=data.get('contact_person'),
            phone=data.get('phone'),
            access_instructions=data.get('access_instructions'),
            notes=data.get('notes')
        )
        
        db.session.add(location)
        db.session.commit()
        
        return jsonify({
            'message': 'Location created successfully',
            'location_id': location.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

