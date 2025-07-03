from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, Quote, QuoteLine, Customer, Location, Article, User, Company
from datetime import datetime, date, timedelta
from decimal import Decimal


quotes_bp = Blueprint('quotes', __name__)

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

def get_user_company_id():
    """Helper function to get current user's company ID"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return user.company_id if user else None

def generate_quote_number(company_id):
    """Generate next quote number for company"""
    company = Company.query.get(company_id)
    if not company:
        return None
    
    year = datetime.now().year
    prefix = f"{company.quote_prefix}{year}-"
    
    # Find highest number for this year
    last_quote = Quote.query.filter(
        Quote.company_id == company_id,
        Quote.quote_number.like(f"{prefix}%")
    ).order_by(Quote.quote_number.desc()).first()
    
    if last_quote:
        try:
            last_number = int(last_quote.quote_number.split('-')[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1
    
    return f"{prefix}{next_number:04d}"

def calculate_quote_totals(quote):
    """Calculate quote totals from lines"""
    subtotal = Decimal('0')
    vat_amount = Decimal('0')
    
    for line in quote.lines:
        line_subtotal = line.line_total / (1 + line.vat_rate / 100)
        line_vat = line.line_total - line_subtotal
        
        subtotal += line_subtotal
        vat_amount += line_vat
    
    quote.subtotal = subtotal
    quote.vat_amount = vat_amount
    quote.total_amount = subtotal + vat_amount

@quotes_bp.route('/', methods=['GET'])
@jwt_required()
def get_quotes():
    """Get all quotes for the company"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        # Parse query parameters
        page = _parse_int_arg('page', 1)
        per_page = _parse_int_arg('per_page', 50, max_value=100)
        status = request.args.get('status', None)
        customer_id = _parse_int_arg('customer_id', None)
        
        # Build query
        query = Quote.query.filter_by(company_id=company_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if customer_id:
            query = query.filter_by(customer_id=customer_id)
        
        # Order by quote date desc
        query = query.order_by(Quote.quote_date.desc())
        
        # Paginate
        quotes = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'quotes': [{
                'id': quote.id,
                'quote_number': quote.quote_number,
                'customer_name': quote.customer.company_name,
                'customer_id': quote.customer_id,
                'title': quote.title,
                'quote_date': quote.quote_date.isoformat(),
                'valid_until': quote.valid_until.isoformat() if quote.valid_until else None,
                'status': quote.status,
                'total_amount': float(quote.total_amount),
                'created_at': quote.created_at.isoformat(),
                'line_count': len(quote.lines)
            } for quote in quotes.items],
            'pagination': {
                'page': quotes.page,
                'pages': quotes.pages,
                'per_page': quotes.per_page,
                'total': quotes.total,
                'has_next': quotes.has_next,
                'has_prev': quotes.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/<quote_id>', methods=['GET'])
@jwt_required()
def get_quote(quote_id):
    """Get specific quote with lines"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        quote = Quote.query.filter_by(
            id=quote_id, company_id=company_id
        ).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        return jsonify({
            'quote': {
                'id': quote.id,
                'quote_number': quote.quote_number,
                'customer_id': quote.customer_id,
                'customer_name': quote.customer.company_name,
                'location_id': quote.location_id,
                'location_name': quote.location.name if quote.location else None,
                'title': quote.title,
                'description': quote.description,
                'quote_date': quote.quote_date.isoformat(),
                'valid_until': quote.valid_until.isoformat() if quote.valid_until else None,
                'status': quote.status,
                'subtotal': float(quote.subtotal),
                'vat_amount': float(quote.vat_amount),
                'total_amount': float(quote.total_amount),
                'notes': quote.notes,
                'terms_conditions': quote.terms_conditions,
                'created_at': quote.created_at.isoformat(),
                'lines': [{
                    'id': line.id,
                    'article_id': line.article_id,
                    'article_code': line.article.code if line.article else None,
                    'article_name': line.article.name if line.article else None,
                    'description': line.description,
                    'quantity': float(line.quantity),
                    'unit_price': float(line.unit_price),
                    'vat_rate': float(line.vat_rate),
                    'line_total': float(line.line_total),
                    'sort_order': line.sort_order
                } for line in sorted(quote.lines, key=lambda x: x.sort_order)]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/', methods=['POST'])
@jwt_required()
def create_quote():
    """Create new quote"""
    try:
        company_id = get_user_company_id()
        user_id = get_jwt_identity()
        
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('customer_id'):
            return jsonify({'error': 'Customer ID is required'}), 400
        
        # Verify customer exists
        customer = Customer.query.filter_by(
            id=data['customer_id'], company_id=company_id
        ).first()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Generate quote number
        quote_number = generate_quote_number(company_id)
        if not quote_number:
            return jsonify({'error': 'Could not generate quote number'}), 500
        
        # Set valid until date (default 30 days)
        quote_date = datetime.strptime(data.get('quote_date', date.today().isoformat()), '%Y-%m-%d').date()
        valid_until = quote_date + timedelta(days=30)
        
        # Create quote
        quote = Quote(
            company_id=company_id,
            quote_number=quote_number,
            customer_id=data['customer_id'],
            location_id=data.get('location_id'),
            title=data.get('title'),
            description=data.get('description'),
            quote_date=quote_date,
            valid_until=valid_until,
            notes=data.get('notes'),
            terms_conditions=data.get('terms_conditions'),
            created_by=user_id
        )
        
        db.session.add(quote)
        db.session.flush()  # Get quote ID
        
        # Add lines if provided
        if data.get('lines'):
            for i, line_data in enumerate(data['lines']):
                if not line_data.get('description') or not line_data.get('quantity') or not line_data.get('unit_price'):
                    continue
                
                quantity = Decimal(str(line_data['quantity']))
                unit_price = Decimal(str(line_data['unit_price']))
                vat_rate = Decimal(str(line_data.get('vat_rate', 21.00)))
                line_total = quantity * unit_price * (1 + vat_rate / 100)
                
                line = QuoteLine(
                    quote_id=quote.id,
                    article_id=line_data.get('article_id'),
                    description=line_data['description'],
                    quantity=quantity,
                    unit_price=unit_price,
                    vat_rate=vat_rate,
                    line_total=line_total,
                    sort_order=i
                )
                db.session.add(line)
        
        # Calculate totals
        db.session.flush()
        calculate_quote_totals(quote)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Quote created successfully',
            'quote_id': quote.id,
            'quote_number': quote.quote_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/<quote_id>', methods=['PUT'])
@jwt_required()
def update_quote(quote_id):
    """Update quote"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        quote = Quote.query.filter_by(
            id=quote_id, company_id=company_id
        ).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        data = request.get_json()
        
        # Update basic fields
        updatable_fields = [
            'customer_id', 'location_id', 'title', 'description',
            'quote_date', 'valid_until', 'status', 'notes', 'terms_conditions'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field in ['quote_date', 'valid_until'] and data[field]:
                    setattr(quote, field, datetime.strptime(data[field], '%Y-%m-%d').date())
                else:
                    setattr(quote, field, data[field])
        
        # Update lines if provided
        if 'lines' in data:
            # Remove existing lines
            QuoteLine.query.filter_by(quote_id=quote.id).delete()
            
            # Add new lines
            for i, line_data in enumerate(data['lines']):
                if not line_data.get('description') or not line_data.get('quantity') or not line_data.get('unit_price'):
                    continue
                
                quantity = Decimal(str(line_data['quantity']))
                unit_price = Decimal(str(line_data['unit_price']))
                vat_rate = Decimal(str(line_data.get('vat_rate', 21.00)))
                line_total = quantity * unit_price * (1 + vat_rate / 100)
                
                line = QuoteLine(
                    quote_id=quote.id,
                    article_id=line_data.get('article_id'),
                    description=line_data['description'],
                    quantity=quantity,
                    unit_price=unit_price,
                    vat_rate=vat_rate,
                    line_total=line_total,
                    sort_order=i
                )
                db.session.add(line)
            
            # Recalculate totals
            db.session.flush()
            calculate_quote_totals(quote)
        
        db.session.commit()
        
        return jsonify({'message': 'Quote updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/<quote_id>/status', methods=['PUT'])
@jwt_required()
def update_quote_status(quote_id):
    """Update quote status"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        quote = Quote.query.filter_by(
            id=quote_id, company_id=company_id
        ).first()
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['draft', 'sent', 'accepted', 'rejected', 'expired']:
            return jsonify({'error': 'Invalid status'}), 400
        
        quote.status = new_status
        db.session.commit()
        
        return jsonify({'message': 'Quote status updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/<quote_id>/duplicate', methods=['POST'])
@jwt_required()
def duplicate_quote(quote_id):
    """Duplicate existing quote"""
    try:
        company_id = get_user_company_id()
        user_id = get_jwt_identity()
        
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        original_quote = Quote.query.filter_by(
            id=quote_id, company_id=company_id
        ).first()
        
        if not original_quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        # Generate new quote number
        quote_number = generate_quote_number(company_id)
        if not quote_number:
            return jsonify({'error': 'Could not generate quote number'}), 500
        
        # Create new quote
        new_quote = Quote(
            company_id=company_id,
            quote_number=quote_number,
            customer_id=original_quote.customer_id,
            location_id=original_quote.location_id,
            title=f"Kopie van {original_quote.title}" if original_quote.title else None,
            description=original_quote.description,
            quote_date=date.today(),
            valid_until=date.today() + timedelta(days=30),
            status='draft',
            notes=original_quote.notes,
            terms_conditions=original_quote.terms_conditions,
            created_by=user_id
        )
        
        db.session.add(new_quote)
        db.session.flush()
        
        # Copy lines
        for original_line in original_quote.lines:
            new_line = QuoteLine(
                quote_id=new_quote.id,
                article_id=original_line.article_id,
                description=original_line.description,
                quantity=original_line.quantity,
                unit_price=original_line.unit_price,
                vat_rate=original_line.vat_rate,
                line_total=original_line.line_total,
                sort_order=original_line.sort_order
            )
            db.session.add(new_line)
        
        # Calculate totals
        db.session.flush()
        calculate_quote_totals(new_quote)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Quote duplicated successfully',
            'quote_id': new_quote.id,
            'quote_number': new_quote.quote_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

