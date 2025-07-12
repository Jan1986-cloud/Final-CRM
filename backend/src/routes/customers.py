from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.database import db, Customer, Location, User
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

customers_bp = Blueprint('customers', __name__)

def _parse_int_arg(name, default=None, max_value=None):
    raw = request.args.get(name, default)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = default
    if max_value is not None and isinstance(value, int):
        value = min(value, max_value)
    return value

def _parse_bool_arg(name, default=False):
    raw = request.args.get(name)
    if raw is None:
        return default
    val = str(raw).strip().lower()
    if val in ['true', '1', 'yes', 'y']:
        return True
    if val in ['false', '0', 'no', 'n']:
        return False
    return default

@customers_bp.route('/', methods=['GET'])
@jwt_required()
def get_customers():
    """Get all customers for the company, adhering to the API contract."""
    try:
        page = _parse_int_arg('page', 1)
        per_page = _parse_int_arg('per_page', 50, max_value=100)
        search = request.args.get('search', '').strip()
        active_only = _parse_bool_arg('active_only', True)
        
        query = Customer.query
        if active_only:
            query = query.filter(Customer.is_active == True)
        
        if search:
            search_filter = or_(
                Customer.company_name.ilike(f'%{search}%'),
                Customer.contact_person.ilike(f'%{search}%'),
                Customer.email.ilike(f'%{search}%'),
                Customer.city.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        customers = query.order_by(Customer.company_name).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'customers': [customer.to_dict() for customer in customers.items],
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
    """Get a specific customer with locations, adhering to the API contract."""
    try:
        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        return jsonify({
            'customer': customer.to_dict(include_locations=True)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@customers_bp.route('/', methods=['POST'])
@jwt_required()
def create_customer():
    """Create new customer"""
    try:
        claims = get_jwt()
        company_id = claims.get('company_id')
        user_id = get_jwt_identity()
        
        data = request.get_json()
        
        if not data or not data.get('company_name'):
            return jsonify({'error': 'Company name is required'}), 400
        
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
        db.session.flush()
        
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
        customer = Customer.query.get(customer_id)
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request'}), 400

        # Update fields
        for field, value in data.items():
            if hasattr(customer, field) and field not in ['id', 'company_id', 'created_at']:
                setattr(customer, field, value)
        
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
        customer = Customer.query.get(customer_id)
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
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
        customer = Customer.query.get(customer_id)
        
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
        customer = Customer.query.get(customer_id)
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        data = request.get_json()
        
        if not data or not data.get('address'):
            return jsonify({'error': 'Address is required'}), 400
        
        location = Location(
            customer_id=customer.id,
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
