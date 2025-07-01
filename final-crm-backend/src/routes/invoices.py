from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, Invoice, InvoiceItem, User, Customer, Article, WorkOrder
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from decimal import Decimal

invoices_bp = Blueprint('invoices', __name__)

@invoices_bp.route('/', methods=['GET'])
@jwt_required()
def get_invoices():
    """Get all invoices for user's company"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        status = request.args.get('status')
        customer_id = request.args.get('customer_id', type=int)
        
        # Build query
        query = Invoice.query.filter_by(company_id=user.company_id)
        
        if status:
            query = query.filter_by(status=status)
        if customer_id:
            query = query.filter_by(customer_id=customer_id)
            
        # Order by creation date (newest first)
        query = query.order_by(Invoice.created_at.desc())
        
        # Paginate
        invoices = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'invoices': [{
                'id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'customer_id': invoice.customer_id,
                'customer_name': invoice.customer.name if invoice.customer else None,
                'invoice_date': invoice.invoice_date.isoformat() if invoice.invoice_date else None,
                'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                'status': invoice.status,
                'subtotal': float(invoice.subtotal) if invoice.subtotal else 0,
                'vat_amount': float(invoice.vat_amount) if invoice.vat_amount else 0,
                'total_amount': float(invoice.total_amount) if invoice.total_amount else 0,
                'payment_terms': invoice.payment_terms,
                'notes': invoice.notes,
                'created_at': invoice.created_at.isoformat() if invoice.created_at else None,
                'items_count': len(invoice.items) if invoice.items else 0
            } for invoice in invoices.items],
            'pagination': {
                'page': invoices.page,
                'pages': invoices.pages,
                'per_page': invoices.per_page,
                'total': invoices.total,
                'has_next': invoices.has_next,
                'has_prev': invoices.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/<int:invoice_id>', methods=['GET'])
@jwt_required()
def get_invoice(invoice_id):
    """Get specific invoice with items"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        invoice = Invoice.query.filter_by(id=invoice_id, company_id=user.company_id).first()
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
            
        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'customer_id': invoice.customer_id,
            'customer': {
                'id': invoice.customer.id,
                'name': invoice.customer.name,
                'email': invoice.customer.email,
                'phone': invoice.customer.phone,
                'address': invoice.customer.address,
                'city': invoice.customer.city,
                'postal_code': invoice.customer.postal_code
            } if invoice.customer else None,
            'invoice_date': invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
            'status': invoice.status,
            'subtotal': float(invoice.subtotal) if invoice.subtotal else 0,
            'vat_rate': float(invoice.vat_rate) if invoice.vat_rate else 0,
            'vat_amount': float(invoice.vat_amount) if invoice.vat_amount else 0,
            'total_amount': float(invoice.total_amount) if invoice.total_amount else 0,
            'payment_terms': invoice.payment_terms,
            'notes': invoice.notes,
            'work_order_ids': invoice.work_order_ids,
            'items': [{
                'id': item.id,
                'article_id': item.article_id,
                'article_name': item.article.name if item.article else item.description,
                'description': item.description,
                'quantity': float(item.quantity),
                'unit_price': float(item.unit_price),
                'total_price': float(item.total_price),
                'vat_rate': float(item.vat_rate)
            } for item in invoice.items] if invoice.items else [],
            'created_at': invoice.created_at.isoformat() if invoice.created_at else None,
            'updated_at': invoice.updated_at.isoformat() if invoice.updated_at else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/', methods=['POST'])
@jwt_required()
def create_invoice():
    """Create new invoice"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Check permissions
        if user.role not in ['admin', 'manager', 'sales', 'financial']:
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['customer_id', 'items']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
                
        # Validate customer exists and belongs to company
        customer = Customer.query.filter_by(id=data['customer_id'], company_id=user.company_id).first()
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
            
        # Generate invoice number
        year = datetime.now().year
        last_invoice = Invoice.query.filter_by(company_id=user.company_id).filter(
            Invoice.invoice_number.like(f'F{year}-%')
        ).order_by(Invoice.invoice_number.desc()).first()
        
        if last_invoice:
            last_number = int(last_invoice.invoice_number.split('-')[1])
            invoice_number = f'F{year}-{last_number + 1:04d}'
        else:
            invoice_number = f'F{year}-0001'
            
        # Create invoice
        invoice_date = datetime.strptime(data['invoice_date'], '%Y-%m-%d').date() if data.get('invoice_date') else datetime.now().date()
        payment_terms = data.get('payment_terms', 30)
        due_date = invoice_date + timedelta(days=payment_terms)
        
        invoice = Invoice(
            invoice_number=invoice_number,
            company_id=user.company_id,
            customer_id=data['customer_id'],
            invoice_date=invoice_date,
            due_date=due_date,
            status=data.get('status', 'draft'),
            payment_terms=payment_terms,
            notes=data.get('notes'),
            work_order_ids=data.get('work_order_ids', []),
            created_by=current_user_id
        )
        
        db.session.add(invoice)
        db.session.flush()  # Get invoice ID
        
        # Add invoice items
        subtotal = Decimal('0')
        vat_amount = Decimal('0')
        
        for item_data in data['items']:
            # Validate item data
            if not all(k in item_data for k in ['quantity', 'unit_price']):
                return jsonify({'error': 'Item quantity and unit_price are required'}), 400
                
            quantity = Decimal(str(item_data['quantity']))
            unit_price = Decimal(str(item_data['unit_price']))
            total_price = quantity * unit_price
            item_vat_rate = Decimal(str(item_data.get('vat_rate', 21)))
            
            # Get article if specified
            article = None
            if item_data.get('article_id'):
                article = Article.query.filter_by(id=item_data['article_id'], company_id=user.company_id).first()
                if not article:
                    return jsonify({'error': f'Article {item_data["article_id"]} not found'}), 404
                    
            item = InvoiceItem(
                invoice_id=invoice.id,
                article_id=item_data.get('article_id'),
                description=item_data.get('description', article.name if article else ''),
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price,
                vat_rate=item_vat_rate
            )
            
            db.session.add(item)
            
            subtotal += total_price
            vat_amount += total_price * (item_vat_rate / 100)
            
        # Update invoice totals
        invoice.subtotal = subtotal
        invoice.vat_rate = Decimal('21')  # Default VAT rate
        invoice.vat_amount = vat_amount
        invoice.total_amount = subtotal + vat_amount
        
        db.session.commit()
        
        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'total_amount': float(invoice.total_amount),
            'message': 'Invoice created successfully'
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/<int:invoice_id>', methods=['PUT'])
@jwt_required()
def update_invoice(invoice_id):
    """Update invoice"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Check permissions
        if user.role not in ['admin', 'manager', 'sales', 'financial']:
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        invoice = Invoice.query.filter_by(id=invoice_id, company_id=user.company_id).first()
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
            
        # Check if invoice can be modified
        if invoice.status in ['paid', 'cancelled']:
            return jsonify({'error': 'Cannot modify paid or cancelled invoice'}), 400
            
        data = request.get_json()
        
        # Update basic fields
        if 'invoice_date' in data:
            invoice.invoice_date = datetime.strptime(data['invoice_date'], '%Y-%m-%d').date()
        if 'due_date' in data:
            invoice.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        if 'status' in data:
            invoice.status = data['status']
        if 'payment_terms' in data:
            invoice.payment_terms = data['payment_terms']
        if 'notes' in data:
            invoice.notes = data['notes']
        if 'work_order_ids' in data:
            invoice.work_order_ids = data['work_order_ids']
            
        # Update items if provided
        if 'items' in data:
            # Delete existing items
            InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
            
            # Add new items
            subtotal = Decimal('0')
            vat_amount = Decimal('0')
            
            for item_data in data['items']:
                quantity = Decimal(str(item_data['quantity']))
                unit_price = Decimal(str(item_data['unit_price']))
                total_price = quantity * unit_price
                item_vat_rate = Decimal(str(item_data.get('vat_rate', 21)))
                
                item = InvoiceItem(
                    invoice_id=invoice.id,
                    article_id=item_data.get('article_id'),
                    description=item_data.get('description', ''),
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price,
                    vat_rate=item_vat_rate
                )
                
                db.session.add(item)
                
                subtotal += total_price
                vat_amount += total_price * (item_vat_rate / 100)
                
            # Update invoice totals
            invoice.subtotal = subtotal
            invoice.vat_amount = vat_amount
            invoice.total_amount = subtotal + vat_amount
            
        invoice.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'message': 'Invoice updated successfully'
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/<int:invoice_id>', methods=['DELETE'])
@jwt_required()
def delete_invoice(invoice_id):
    """Delete invoice (only if draft)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Check permissions
        if user.role not in ['admin', 'manager', 'financial']:
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        invoice = Invoice.query.filter_by(id=invoice_id, company_id=user.company_id).first()
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
            
        # Only allow deletion of draft invoices
        if invoice.status != 'draft':
            return jsonify({'error': 'Can only delete draft invoices'}), 400
            
        # Delete invoice items first
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        
        # Delete invoice
        db.session.delete(invoice)
        db.session.commit()
        
        return jsonify({'message': 'Invoice deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/from-work-orders', methods=['POST'])
@jwt_required()
def create_invoice_from_work_orders():
    """Create combined invoice from multiple work orders"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Check permissions
        if user.role not in ['admin', 'manager', 'sales', 'financial']:
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        data = request.get_json()
        work_order_ids = data.get('work_order_ids', [])
        
        if not work_order_ids:
            return jsonify({'error': 'work_order_ids is required'}), 400
            
        # Get work orders
        work_orders = WorkOrder.query.filter(
            WorkOrder.id.in_(work_order_ids),
            WorkOrder.company_id == user.company_id,
            WorkOrder.status == 'completed'
        ).all()
        
        if not work_orders:
            return jsonify({'error': 'No completed work orders found'}), 404
            
        # Check if all work orders belong to same customer
        customer_ids = list(set([wo.customer_id for wo in work_orders]))
        if len(customer_ids) > 1:
            return jsonify({'error': 'All work orders must belong to the same customer'}), 400
            
        customer_id = customer_ids[0]
        
        # Generate invoice number
        year = datetime.now().year
        last_invoice = Invoice.query.filter_by(company_id=user.company_id).filter(
            Invoice.invoice_number.like(f'F{year}-%')
        ).order_by(Invoice.invoice_number.desc()).first()
        
        if last_invoice:
            last_number = int(last_invoice.invoice_number.split('-')[1])
            invoice_number = f'F{year}-{last_number + 1:04d}'
        else:
            invoice_number = f'F{year}-0001'
            
        # Create invoice
        invoice_date = datetime.now().date()
        payment_terms = data.get('payment_terms', 30)
        due_date = invoice_date + timedelta(days=payment_terms)
        
        invoice = Invoice(
            invoice_number=invoice_number,
            company_id=user.company_id,
            customer_id=customer_id,
            invoice_date=invoice_date,
            due_date=due_date,
            status='draft',
            payment_terms=payment_terms,
            notes=f"Combined invoice for work orders: {', '.join([wo.work_order_number for wo in work_orders])}",
            work_order_ids=work_order_ids,
            created_by=current_user_id
        )
        
        db.session.add(invoice)
        db.session.flush()
        
        # Add items from work orders
        subtotal = Decimal('0')
        vat_amount = Decimal('0')
        
        for work_order in work_orders:
            for wo_item in work_order.items:
                item = InvoiceItem(
                    invoice_id=invoice.id,
                    article_id=wo_item.article_id,
                    description=f"{wo_item.description} (Work Order: {work_order.work_order_number})",
                    quantity=wo_item.quantity,
                    unit_price=wo_item.unit_price,
                    total_price=wo_item.total_price,
                    vat_rate=wo_item.vat_rate
                )
                
                db.session.add(item)
                
                subtotal += wo_item.total_price
                vat_amount += wo_item.total_price * (wo_item.vat_rate / 100)
                
        # Update invoice totals
        invoice.subtotal = subtotal
        invoice.vat_rate = Decimal('21')
        invoice.vat_amount = vat_amount
        invoice.total_amount = subtotal + vat_amount
        
        # Mark work orders as invoiced
        for work_order in work_orders:
            work_order.status = 'invoiced'
            
        db.session.commit()
        
        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'total_amount': float(invoice.total_amount),
            'work_orders_count': len(work_orders),
            'message': 'Combined invoice created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@invoices_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_invoice_stats():
    """Get invoice statistics for dashboard"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Get current year invoices
        current_year = datetime.now().year
        year_start = datetime(current_year, 1, 1)
        
        invoices = Invoice.query.filter_by(company_id=user.company_id).filter(
            Invoice.created_at >= year_start
        ).all()
        
        # Calculate statistics
        total_invoices = len(invoices)
        total_amount = sum([float(inv.total_amount) for inv in invoices if inv.total_amount])
        paid_invoices = len([inv for inv in invoices if inv.status == 'paid'])
        pending_invoices = len([inv for inv in invoices if inv.status in ['sent', 'overdue']])
        draft_invoices = len([inv for inv in invoices if inv.status == 'draft'])
        
        # Outstanding amount (sent + overdue)
        outstanding_amount = sum([
            float(inv.total_amount) for inv in invoices 
            if inv.status in ['sent', 'overdue'] and inv.total_amount
        ])
        
        return jsonify({
            'total_invoices': total_invoices,
            'total_amount': total_amount,
            'paid_invoices': paid_invoices,
            'pending_invoices': pending_invoices,
            'draft_invoices': draft_invoices,
            'outstanding_amount': outstanding_amount,
            'average_invoice_amount': total_amount / total_invoices if total_invoices > 0 else 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

