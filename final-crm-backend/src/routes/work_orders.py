from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
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

def generate_work_order_number(company_id):
    """Generate next work order number for company"""
    company = Company.query.get(company_id)
    if not company:
        return None
    
    year = datetime.now().year
    prefix = f"{company.work_order_prefix}{year}-"
    
    # Find highest number for this year
    last_wo = WorkOrder.query.filter(
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
    materials_subtotal = Decimal('0')
    materials_vat = Decimal('0')
    labor_subtotal = Decimal('0')
    labor_vat = Decimal('0')
    
    # Calculate materials total
    for line in work_order.lines:
        line_subtotal = line.line_total / (1 + line.vat_rate / 100)
        line_vat = line.line_total - line_subtotal
        
        materials_subtotal += line_subtotal
        materials_vat += line_vat
    
    # Calculate labor total
    for entry in work_order.time_entries:
        if entry.billable:
            entry_subtotal = entry.billable_amount / (1 + entry.vat_rate / 100)
            entry_vat = entry.billable_amount - entry_subtotal
            
            labor_subtotal += entry_subtotal
            labor_vat += entry_vat
    
    work_order.materials_subtotal = materials_subtotal
    work_order.materials_vat = materials_vat
    work_order.labor_subtotal = labor_subtotal
    work_order.labor_vat = labor_vat
    work_order.total_amount = materials_subtotal + materials_vat + labor_subtotal + labor_vat

@work_orders_bp.route('/', methods=['GET'])
@jwt_required()
def get_work_orders():
    """Get all work orders for the company"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        # Parse query parameters
        page = _parse_int_arg('page', 1)
        per_page = _parse_int_arg('per_page', 50, max_value=100)
        status = request.args.get('status', None)
        customer_id = _parse_int_arg('customer_id', None)
        technician_id = _parse_int_arg('technician_id', None)
        
        # Build query
        query = WorkOrder.query.filter_by(company_id=company_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if customer_id:
            query = query.filter_by(customer_id=customer_id)
        
        if technician_id:
            query = query.filter_by(assigned_to=technician_id)
        
        # Order by scheduled date desc
        query = query.order_by(WorkOrder.scheduled_date.desc())
        
        # Paginate
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
                'scheduled_date': wo.scheduled_date.isoformat() if wo.scheduled_date else None,
                'status': wo.status,
                'priority': wo.priority,
                'assigned_to_name': wo.assigned_user.full_name if wo.assigned_user else None,
                'total_amount': float(wo.total_amount),
                'created_at': wo.created_at.isoformat(),
                'total_hours': sum(float(entry.hours) for entry in wo.time_entries)
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
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        work_order = WorkOrder.query.filter_by(
            id=work_order_id, company_id=company_id
        ).first()
        
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
                'scheduled_date': work_order.scheduled_date.isoformat() if work_order.scheduled_date else None,
                'completed_date': work_order.completed_date.isoformat() if work_order.completed_date else None,
                'status': work_order.status,
                'priority': work_order.priority,
                'assigned_to': work_order.assigned_to,
                'assigned_to_name': work_order.assigned_user.full_name if work_order.assigned_user else None,
                'materials_subtotal': float(work_order.materials_subtotal),
                'materials_vat': float(work_order.materials_vat),
                'labor_subtotal': float(work_order.labor_subtotal),
                'labor_vat': float(work_order.labor_vat),
                'total_amount': float(work_order.total_amount),
                'notes': work_order.notes,
                'customer_signature': work_order.customer_signature,
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
                    'start_time': entry.start_time.isoformat() if entry.start_time else None,
                    'end_time': entry.end_time.isoformat() if entry.end_time else None,
                    'hours': float(entry.hours),
                    'description': entry.description,
                    'billable': entry.billable,
                    'hourly_rate': float(entry.hourly_rate) if entry.hourly_rate else None,
                    'billable_amount': float(entry.billable_amount),
                    'vat_rate': float(entry.vat_rate),
                    'created_at': entry.created_at.isoformat()
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
        
        # Generate work order number
        work_order_number = generate_work_order_number(company_id)
        if not work_order_number:
            return jsonify({'error': 'Could not generate work order number'}), 500
        
        # Parse scheduled date
        scheduled_date = None
        if data.get('scheduled_date'):
            scheduled_date = datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date()
        
        # Create work order
        work_order = WorkOrder(
            company_id=company_id,
            work_order_number=work_order_number,
            quote_id=data.get('quote_id'),
            customer_id=data['customer_id'],
            location_id=data.get('location_id'),
            title=data.get('title'),
            description=data.get('description'),
            scheduled_date=scheduled_date,
            priority=data.get('priority', 'medium'),
            assigned_to=data.get('assigned_to'),
            notes=data.get('notes'),
            created_by=user_id
        )
        
        db.session.add(work_order)
        db.session.flush()  # Get work order ID
        
        # Add lines if provided
        if data.get('lines'):
            for i, line_data in enumerate(data['lines']):
                if not line_data.get('description') or not line_data.get('quantity') or not line_data.get('unit_price'):
                    continue
                
                quantity = Decimal(str(line_data['quantity']))
                unit_price = Decimal(str(line_data['unit_price']))
                vat_rate = Decimal(str(line_data.get('vat_rate', 21.00)))
                line_total = quantity * unit_price * (1 + vat_rate / 100)
                
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
        
        # Calculate totals
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
        company_id = get_user_company_id()
        user_id = get_jwt_identity()
        
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        work_order = WorkOrder.query.filter_by(
            id=work_order_id, company_id=company_id
        ).first()
        
        if not work_order:
            return jsonify({'error': 'Work order not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('hours') or not data.get('description'):
            return jsonify({'error': 'Hours and description are required'}), 400
        
        # Parse times if provided
        start_time = None
        end_time = None
        
        if data.get('start_time'):
            start_time = datetime.fromisoformat(data['start_time'])
        
        if data.get('end_time'):
            end_time = datetime.fromisoformat(data['end_time'])
        
        # Calculate billable amount
        hours = Decimal(str(data['hours']))
        hourly_rate = Decimal(str(data.get('hourly_rate', 0)))
        billable = data.get('billable', True)
        vat_rate = Decimal(str(data.get('vat_rate', 21.00)))
        
        billable_amount = Decimal('0')
        if billable and hourly_rate > 0:
            billable_amount = hours * hourly_rate * (1 + vat_rate / 100)
        
        # Create time entry
        time_entry = WorkOrderTimeEntry(
            work_order_id=work_order.id,
            user_id=data.get('user_id', user_id),
            start_time=start_time,
            end_time=end_time,
            hours=hours,
            description=data['description'],
            billable=billable,
            hourly_rate=hourly_rate if billable else None,
            billable_amount=billable_amount,
            vat_rate=vat_rate
        )
        
        db.session.add(time_entry)
        
        # Recalculate work order totals
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
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        work_order = WorkOrder.query.filter_by(
            id=work_order_id, company_id=company_id
        ).first()
        
        if not work_order:
            return jsonify({'error': 'Work order not found'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['scheduled', 'in_progress', 'completed', 'cancelled']:
            return jsonify({'error': 'Invalid status'}), 400
        
        work_order.status = new_status
        
        # Set completed date if status is completed
        if new_status == 'completed' and not work_order.completed_date:
            work_order.completed_date = date.today()
        
        db.session.commit()
        
        return jsonify({'message': 'Work order status updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

