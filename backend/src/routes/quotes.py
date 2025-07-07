from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
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

def generate_quote_number(company_id):
    """Generate next quote number for company"""
    # Bypass multi-tenant query scoping by using session query directly
    company = db.session.query(Company).get(company_id)
    if not company:
        return None
    
    year = datetime.now().year
    prefix = f"{company.quote_prefix}{year}-"
    
    last_quote = (
        db.session.query(Quote)
        .filter(
            Quote.company_id == company_id,
            Quote.quote_number.like(f"{prefix}%"),
        )
        .order_by(Quote.quote_number.desc())
        .first()
    )
    
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
        line_total = Decimal(line.line_total)
        vat_rate = Decimal(line.vat_rate)
        line_subtotal = line_total / (1 + vat_rate / 100)
        line_vat = line_total - line_subtotal
        
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
        page = _parse_int_arg('page', 1)
        per_page = _parse_int_arg('per_page', 50, max_value=100)
        status = request.args.get('status')
        customer_id = request.args.get('customer_id')

        query = Quote.query
        
        if status:
            query = query.filter(Quote.status == status)
        
        if customer_id:
            query = query.filter(Quote.customer_id == customer_id)
        
        query = query.order_by(Quote.quote_date.desc())
        
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
        quote = Quote.query.get(quote_id)
        
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
        claims = get_jwt()
        company_id = claims.get('company_id')
        user_id = get_jwt_identity()
        
        data = request.get_json()
        
        if not data or not data.get('customer_id'):
            return jsonify({'error': 'Customer ID is required'}), 400
        
        if not Customer.query.get(data['customer_id']):
             return jsonify({'error': 'Customer not found'}), 404
        
        quote_number = generate_quote_number(company_id)
        if not quote_number:
            return jsonify({'error': 'Could not generate quote number'}), 500
        
        quote_date = datetime.strptime(data.get('quote_date', date.today().isoformat()), '%Y-%m-%d').date()
        valid_until = quote_date + timedelta(days=30)
        
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
        db.session.flush()
        
        if data.get('lines'):
            for i, line_data in enumerate(data['lines']):
                if not all(k in line_data for k in ['description', 'quantity', 'unit_price']):
                    continue
                
                quantity = Decimal(str(line_data['quantity']))
                unit_price = Decimal(str(line_data['unit_price']))
                vat_rate = Decimal(str(line_data.get('vat_rate', 21.00)))
                line_total = quantity * unit_price
                
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
        quote = Quote.query.get(quote_id)
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid request'}), 400
            
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
        
        if 'lines' in data:
            QuoteLine.query.filter_by(quote_id=quote.id).delete()
            
            for i, line_data in enumerate(data['lines']):
                if not all(k in line_data for k in ['description', 'quantity', 'unit_price']):
                    continue
                
                quantity = Decimal(str(line_data['quantity']))
                unit_price = Decimal(str(line_data['unit_price']))
                vat_rate = Decimal(str(line_data.get('vat_rate', 21.00)))
                line_total = quantity * unit_price
                
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
        quote = Quote.query.get(quote_id)
        
        if not quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['draft', 'sent', 'accepted', 'rejected', 'expired']:
            return jsonify({'error': 'Invalid status'}), 400
        
        quote.status = new_status
        db.session.commit()
        
        return jsonify({'message': f"Quote status updated to {new_status}"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@quotes_bp.route('/<quote_id>/duplicate', methods=['POST'])
@jwt_required()
def duplicate_quote(quote_id):
    """Duplicate existing quote"""
    try:
        claims = get_jwt()
        company_id = claims.get('company_id')
        user_id = get_jwt_identity()
        
        original_quote = Quote.query.get(quote_id)
        
        if not original_quote:
            return jsonify({'error': 'Quote not found'}), 404
        
        quote_number = generate_quote_number(company_id)
        if not quote_number:
            return jsonify({'error': 'Could not generate quote number'}), 500
        
        new_quote = Quote(
            company_id=company_id,
            quote_number=quote_number,
            customer_id=original_quote.customer_id,
            location_id=original_quote.location_id,
            title=f"Kopie van {original_quote.title or ''}".strip(),
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
