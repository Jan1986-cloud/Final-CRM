from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from src.models.database import db, WorkOrder, WorkOrderLine, WorkOrderTimeEntry, Customer, Location, Article, User, Company
from datetime import datetime, date
from decimal import Decimal

work_orders_bp = Blueprint('work_orders', __name__)

def _parse_int_arg(name, default=None, max_value=None):
    raw = request.args.get(name, default)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        value = default
    if max_value is not None and isinstance(value, int):
        value = min(value, max_value)
    return value

def generate_work_order_number(company_id):
    """Generate next work order number for company"""
    company = Company.query.unscoped().get(company_id)
    if not company:
        return None
    
    year = datetime.now().year
    prefix = f"{company.workorder_prefix}{year}-"
    
    last_wo = WorkOrder.query.unscoped().filter(
        WorkOrder.company_id == company_id,
        WorkOrder.work_order_number.like(f"{prefix}%")
    ).order_by(WorkOrder.work_order_number.desc()).first()
    
    if last_wo:
        try:
            last_number = int(last_wo.work_order_number.split('-')[-1])
            next_number = last_number + 1
        except:
            next_number = 1
    else:
        next_number = 1
    
    return f"{prefix}{next_number:04d}"

def calculate_work_order_totals(work_order):
    """Calculate work order totals from lines and time entries"""
    subtotal = Decimal('0')
    vat_amount = Decimal('0')
    
    for line in work_order.lines:
        line_total = Decimal(line.line_total)
        vat_rate = Decimal(line.vat_rate)
        line_subtotal = line_total / (1 + vat_rate / 100)
        line_vat = line_total - line_subtotal
        
        subtotal += line_subtotal
        vat_amount += line_vat

    for entry in work_order.time_entries:
        if entry.billable:
            billable_amount = Decimal(entry.billable_amount)
            vat_rate = Decimal(entry.vat_rate)
            entry_subtotal = billable_amount / (1 + vat_rate / 100)
            entry_vat = billable_amount - entry_subtotal
            
            subtotal += entry_subtotal
            vat_amount += entry_vat

    work_order.subtotal = subtotal
    work_order.vat_amount = vat_amount
    work_order.total_amount = subtotal + vat_amount


@work_orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_work_orders():
    """Get all work orders for the company"""
    try:
        page = _parse_int_arg('page', 1)
        per_page = _parse_int_arg('per_page', 50, max_value=100)
        status = request.args.get('status')
        customer_id = request.args.get('customer_id')
        technician_id = request.args.get('technician_id')
        
        query = WorkOrder.query
        
        if status:
            query = query.filter(WorkOrder.status == status)
        
        if customer_id:
            query = query.filter(WorkOrder.customer_id == customer_id)
        
        if technician_id:
            query = query.filter(WorkOrder.technician_id == technician_id)
        
        query = query.order_by(WorkOrder.work_date.desc())
        
        work_orders = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'work_orders': [{
                'id': wo.id,
                'work_order_number': wo.work_order_number,
                'customer_name': wo.customer.company_name,
                'customer_id': wo.customer_id,
                'location_name': wo.location.name if wo.location else None,
                'title': wo.title,
                'work_date': wo.work_date.isoformat() if wo.work_date else None,
                'status': wo.status,
                'total_amount': float(wo.total_amount),
                'created_at': wo.created_at.isoformat()
            } for wo in work_orders.items],
            'pagination': {
                'page': work_orders.page,
                'pages': work_orders.pages,
                'per_page': work_orders.per_page,
                'total': work_orders.total,
                'has_next': work_orders.has_next,
                'has_prev': work_orders.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@work_orders_bp.route('/<work_order_id>', methods=['GET'])
@jwt_required()
def get_work_order(work_order_id):
    """Get specific work order with lines and time entries"""
    try:
        work_order = WorkOrder.query.get(work_order_id)
        
        if not work_order:
            return jsonify({'error': 'Work order not found'}), 404
        
        return jsonify({
            'work_order': {
                'id': work_order.id,
                'work_order_number': work_order.work_order_number,
                'quote_id': work_order.quote_id,
                'customer_id': work_order.customer_id,
                'customer_name': work_order.customer.company_name,
                'location_id': work_order.location_id,
                'location_name': work_order.location.name if work_order.location else None,
                'title': work_order.title,
                'description': work_order.description,
                'work_date': work_order.work_date.isoformat() if work_order.work_date else None,
                'status': work_order.status,
                'technician_id': work_order.technician_id,
                'subtotal': float(work_order.subtotal),
                'vat_amount': float(work_order.vat_amount),
                'total_amount': float(work_order.total_amount),
                'notes': work_order.notes,
                'created_at': work_order.created_at.isoformat(),
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
                } for line in sorted(work_order.lines, key=lambda x: x.sort_order)],
                'time_entries': [{
                    'id': entry.id,
                    'user_id': entry.user_id,
                    'user_name': entry.user.full_name,
                    'date': entry.date.isoformat(),
                    'start_time': entry.start_time.isoformat() if entry.start_time else None,
                    'end_time': entry.end_time.isoformat() if entry.end_time else None,
                    'hours': float(entry.hours),
                    'description': entry.description,
                    'billable': entry.billable,
                    'hourly_rate': float(entry.hourly_rate) if entry.hourly_rate else None,
                    'billable_amount': float(entry.billable_amount),
                    'vat_rate': float(entry.vat_rate)
                } for entry in work_order.time_entries]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@work_orders_bp.route('/', methods=['POST'])
@jwt_required()
def create_work_order():
    """Create new work order"""
    try:
        claims = get_jwt()
        company_id = claims.get('company_id')
        user_id = get_jwt_identity()
        
        data = request.get_json()
        
        if not data or not data.get('customer_id'):
            return jsonify({'error': 'Customer ID is required'}), 400
        
        if not Customer.query.get(data['customer_id']):
             return jsonify({'error': 'Customer not found'}), 404
        
        work_order_number = generate_work_order_number(company_id)
        if not work_order_number:
            return jsonify({'error': 'Could not generate work order number'}), 500
        
        work_date = None
        if data.get('work_date'):
            work_date = datetime.strptime(data['work_date'], '%Y-%m-%d').date()
        
        work_order = WorkOrder(
            company_id=company_id,
            work_order_number=work_order_number,
            quote_id=data.get('quote_id'),
            customer_id=data['customer_id'],
            location_id=data.get('location_id'),
            title=data.get('title'),
            description=data.get('description'),
            work_date=work_date,
            status=data.get('status', 'planned'),
            technician_id=data.get('technician_id'),
            notes=data.get('notes'),
            created_by=user_id
        )
        
        db.session.add(work_order)
        db.session.flush()
        
        if data.get('lines'):
            for i, line_data in enumerate(data['lines']):
                if not all(k in line_data for k in ['description', 'quantity', 'unit_price']):
                    continue
                
                quantity = Decimal(str(line_data['quantity']))
                unit_price = Decimal(str(line_data['unit_price']))
                vat_rate = Decimal(str(line_data.get('vat_rate', 21.00)))
                line_total = quantity * unit_price
                
                line = WorkOrderLine(
                    work_order_id=work_order.id,
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
        calculate_work_order_totals(work_order)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Work order created successfully',
            'work_order_id': work_order.id,
            'work_order_number': work_order.work_order_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@work_orders_bp.route('/<work_order_id>/time-entries', methods=['POST'])
@jwt_required()
def add_time_entry(work_order_id):
    """Add time entry to work order"""
    try:
        claims = get_jwt()
        company_id = claims.get('company_id')
        user_id = get_jwt_identity()

        work_order = WorkOrder.query.get(work_order_id)
        
        if not work_order:
            return jsonify({'error': 'Work order not found'}), 404
        
        data = request.get_json()
        
        if not data or not all(k in data for k in ['hours', 'description']):
            return jsonify({'error': 'Hours and description are required'}), 400
        
        hours = Decimal(str(data['hours']))
        hourly_rate = Decimal(str(data.get('hourly_rate', 0)))
        billable = data.get('billable', True)
        vat_rate = Decimal(str(data.get('vat_rate', 21.00)))
        
        billable_amount = Decimal('0')
        if billable and hourly_rate > 0:
            billable_amount = hours * hourly_rate
        
        time_entry = WorkOrderTimeEntry(
            company_id=company_id,
            user_id=data.get('user_id', user_id),
            work_order_id=work_order.id,
            date=datetime.strptime(data['date'], '%Y-%m-%d').date() if data.get('date') else date.today(),
            start_time=datetime.strptime(data['start_time'], '%H:%M:%S').time() if data.get('start_time') else None,
            end_time=datetime.strptime(data['end_time'], '%H:%M:%S').time() if data.get('end_time') else None,
            hours=hours,
            description=data['description'],
            billable=billable,
            hourly_rate=hourly_rate,
            billable_amount=billable_amount,
            vat_rate=vat_rate
        )
        
        db.session.add(time_entry)
        
        db.session.flush()
        calculate_work_order_totals(work_order)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Time entry added successfully',
            'time_entry_id': time_entry.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@work_orders_bp.route('/<work_order_id>/status', methods=['PUT'])
@jwt_required()
def update_work_order_status(work_order_id):
    """Update work order status"""
    try:
        work_order = WorkOrder.query.get(work_order_id)
        
        if not work_order:
            return jsonify({'error': 'Work order not found'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['planned', 'in_progress', 'completed', 'invoiced']:
            return jsonify({'error': 'Invalid status'}), 400
        
        work_order.status = new_status
        
        db.session.commit()
        
        return jsonify({'message': f'Work order status updated to {new_status}'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
