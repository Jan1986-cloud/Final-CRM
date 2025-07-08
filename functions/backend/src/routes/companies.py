from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, Company, User
from sqlalchemy.exc import IntegrityError

companies_bp = Blueprint('companies', __name__)

@companies_bp.route('/', methods=['GET'])
@jwt_required()
def get_companies():
    """Get all companies (admin only) or current user's company"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # If admin, return all companies, otherwise just user's company
        if user.role == 'admin':
            companies = Company.query.all()
        else:
            companies = [user.company] if user.company else []
            
        return jsonify([{
            'id': company.id,
            'name': company.name,
            'email': company.email,
            'phone': company.phone,
            'address': company.address,
            'city': company.city,
            'postal_code': company.postal_code,
            'country': company.country,
            'vat_number': company.vat_number,
            'chamber_of_commerce': company.chamber_of_commerce,
            'bank_account': company.bank_account,
            'logo_url': company.logo_url,
            'created_at': company.created_at.isoformat() if company.created_at else None
        } for company in companies]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/<int:company_id>', methods=['GET'])
@jwt_required()
def get_company(company_id):
    """Get specific company details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'error': 'Company not found'}), 404
            
        # Check if user has access to this company
        if user.role != 'admin' and user.company_id != company_id:
            return jsonify({'error': 'Access denied'}), 403
            
        return jsonify({
            'id': company.id,
            'name': company.name,
            'email': company.email,
            'phone': company.phone,
            'address': company.address,
            'city': company.city,
            'postal_code': company.postal_code,
            'country': company.country,
            'vat_number': company.vat_number,
            'chamber_of_commerce': company.chamber_of_commerce,
            'bank_account': company.bank_account,
            'logo_url': company.logo_url,
            'created_at': company.created_at.isoformat() if company.created_at else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/', methods=['POST'])
@jwt_required()
def create_company():
    """Create new company (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
                
        company = Company(
            name=data['name'],
            email=data['email'],
            phone=data.get('phone'),
            address=data.get('address'),
            city=data.get('city'),
            postal_code=data.get('postal_code'),
            country=data.get('country', 'Netherlands'),
            vat_number=data.get('vat_number'),
            chamber_of_commerce=data.get('chamber_of_commerce'),
            bank_account=data.get('bank_account'),
            logo_url=data.get('logo_url')
        )
        
        db.session.add(company)
        db.session.commit()
        
        return jsonify({
            'id': company.id,
            'name': company.name,
            'email': company.email,
            'message': 'Company created successfully'
        }), 201
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Company with this email already exists'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/<int:company_id>', methods=['PUT'])
@jwt_required()
def update_company(company_id):
    """Update company details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'error': 'Company not found'}), 404
            
        # Check if user has access to update this company
        if user.role not in ['admin', 'manager'] or (user.role == 'manager' and user.company_id != company_id):
            return jsonify({'error': 'Access denied'}), 403
            
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            company.name = data['name']
        if 'email' in data:
            company.email = data['email']
        if 'phone' in data:
            company.phone = data['phone']
        if 'address' in data:
            company.address = data['address']
        if 'city' in data:
            company.city = data['city']
        if 'postal_code' in data:
            company.postal_code = data['postal_code']
        if 'country' in data:
            company.country = data['country']
        if 'vat_number' in data:
            company.vat_number = data['vat_number']
        if 'chamber_of_commerce' in data:
            company.chamber_of_commerce = data['chamber_of_commerce']
        if 'bank_account' in data:
            company.bank_account = data['bank_account']
        if 'logo_url' in data:
            company.logo_url = data['logo_url']
            
        db.session.commit()
        
        return jsonify({
            'id': company.id,
            'name': company.name,
            'message': 'Company updated successfully'
        }), 200
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Company with this email already exists'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/<int:company_id>', methods=['DELETE'])
@jwt_required()
def delete_company(company_id):
    """Delete company (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'error': 'Company not found'}), 404
            
        # Check if company has users
        if company.users:
            return jsonify({'error': 'Cannot delete company with active users'}), 400
            
        db.session.delete(company)
        db.session.commit()
        
        return jsonify({'message': 'Company deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@companies_bp.route('/<int:company_id>/settings', methods=['GET'])
@jwt_required()
def get_company_settings(company_id):
    """Get company settings and configuration"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        company = Company.query.get(company_id)
        if not company:
            return jsonify({'error': 'Company not found'}), 404
            
        # Check if user has access to this company
        if user.role not in ['admin', 'manager'] or (user.role == 'manager' and user.company_id != company_id):
            return jsonify({'error': 'Access denied'}), 403
            
        # Return company settings (can be extended with more configuration options)
        settings = {
            'company_info': {
                'name': company.name,
                'email': company.email,
                'phone': company.phone,
                'address': company.address,
                'city': company.city,
                'postal_code': company.postal_code,
                'country': company.country,
                'vat_number': company.vat_number,
                'chamber_of_commerce': company.chamber_of_commerce,
                'bank_account': company.bank_account,
                'logo_url': company.logo_url
            },
            'document_settings': {
                'default_vat_rate': 21.0,
                'invoice_prefix': 'F',
                'quote_prefix': 'O',
                'work_order_prefix': 'W',
                'payment_terms_days': 30
            },
            'system_settings': {
                'timezone': 'Europe/Amsterdam',
                'currency': 'EUR',
                'date_format': 'DD-MM-YYYY'
            }
        }
        
        return jsonify(settings), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

