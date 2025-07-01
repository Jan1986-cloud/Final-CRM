from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, Article, ArticleCategory, User
from sqlalchemy import or_

articles_bp = Blueprint('articles', __name__)

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

@articles_bp.route('/', methods=['GET'])
@jwt_required()
def get_articles():
    """Get all articles for the company"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        # Parse query parameters
        page = _parse_int_arg('page', 1)
        per_page = _parse_int_arg('per_page', 50, max_value=100)
        search = request.args.get('search', '').strip()
        category_id = _parse_int_arg('category_id', None)
        active_only = _parse_bool_arg('active_only', True)
        low_stock = _parse_bool_arg('low_stock', False)
        
        # Build query
        query = Article.query.filter_by(company_id=company_id)
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        if low_stock:
            query = query.filter(Article.stock_quantity <= Article.min_stock_level)
        
        if search:
            search_filter = or_(
                Article.code.ilike(f'%{search}%'),
                Article.name.ilike(f'%{search}%'),
                Article.description.ilike(f'%{search}%'),
                Article.supplier.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        # Order by code
        query = query.order_by(Article.code)
        
        # Paginate
        articles = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'articles': [{
                'id': article.id,
                'code': article.code,
                'name': article.name,
                'description': article.description,
                'unit': article.unit,
                'purchase_price': float(article.purchase_price) if article.purchase_price else None,
                'selling_price': float(article.selling_price),
                'vat_rate': float(article.vat_rate),
                'stock_quantity': float(article.stock_quantity),
                'min_stock_level': float(article.min_stock_level),
                'supplier': article.supplier,
                'supplier_code': article.supplier_code,
                'is_active': article.is_active,
                'category_name': article.category.name if article.category else None,
                'is_low_stock': article.stock_quantity <= article.min_stock_level,
                'created_at': article.created_at.isoformat()
            } for article in articles.items],
            'pagination': {
                'page': articles.page,
                'pages': articles.pages,
                'per_page': articles.per_page,
                'total': articles.total,
                'has_next': articles.has_next,
                'has_prev': articles.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@articles_bp.route('/<article_id>', methods=['GET'])
@jwt_required()
def get_article(article_id):
    """Get specific article"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        article = Article.query.filter_by(
            id=article_id, company_id=company_id
        ).first()
        
        if not article:
            return jsonify({'error': 'Article not found'}), 404
        
        return jsonify({
            'article': {
                'id': article.id,
                'code': article.code,
                'name': article.name,
                'description': article.description,
                'unit': article.unit,
                'purchase_price': float(article.purchase_price) if article.purchase_price else None,
                'selling_price': float(article.selling_price),
                'vat_rate': float(article.vat_rate),
                'stock_quantity': float(article.stock_quantity),
                'min_stock_level': float(article.min_stock_level),
                'supplier': article.supplier,
                'supplier_code': article.supplier_code,
                'is_active': article.is_active,
                'category_id': article.category_id,
                'category_name': article.category.name if article.category else None,
                'created_at': article.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@articles_bp.route('/', methods=['POST'])
@jwt_required()
def create_article():
    """Create new article"""
    try:
        company_id = get_user_company_id()
        user_id = get_jwt_identity()
        
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['code', 'name', 'selling_price']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if code already exists
        existing = Article.query.filter_by(
            company_id=company_id, code=data['code']
        ).first()
        
        if existing:
            return jsonify({'error': 'Article code already exists'}), 400
        
        # Create article
        article = Article(
            company_id=company_id,
            category_id=data.get('category_id'),
            code=data['code'],
            name=data['name'],
            description=data.get('description'),
            unit=data.get('unit', 'stuks'),
            purchase_price=data.get('purchase_price'),
            selling_price=data['selling_price'],
            vat_rate=data.get('vat_rate', 21.00),
            stock_quantity=data.get('stock_quantity', 0),
            min_stock_level=data.get('min_stock_level', 0),
            supplier=data.get('supplier'),
            supplier_code=data.get('supplier_code'),
            created_by=user_id
        )
        
        db.session.add(article)
        db.session.commit()
        
        return jsonify({
            'message': 'Article created successfully',
            'article_id': article.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@articles_bp.route('/<article_id>', methods=['PUT'])
@jwt_required()
def update_article(article_id):
    """Update article"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        article = Article.query.filter_by(
            id=article_id, company_id=company_id
        ).first()
        
        if not article:
            return jsonify({'error': 'Article not found'}), 404
        
        data = request.get_json()
        
        # Check if code change conflicts
        if 'code' in data and data['code'] != article.code:
            existing = Article.query.filter_by(
                company_id=company_id, code=data['code']
            ).first()
            if existing:
                return jsonify({'error': 'Article code already exists'}), 400
        
        # Update fields
        updatable_fields = [
            'category_id', 'code', 'name', 'description', 'unit',
            'purchase_price', 'selling_price', 'vat_rate', 'stock_quantity',
            'min_stock_level', 'supplier', 'supplier_code', 'is_active'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(article, field, data[field])
        
        db.session.commit()
        
        return jsonify({'message': 'Article updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@articles_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """Get all article categories"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        categories = ArticleCategory.query.filter_by(
            company_id=company_id
        ).order_by(ArticleCategory.name).all()
        
        return jsonify({
            'categories': [{
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'article_count': len(category.articles)
            } for category in categories]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@articles_bp.route('/categories', methods=['POST'])
@jwt_required()
def create_category():
    """Create new article category"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400
        
        category = ArticleCategory(
            company_id=company_id,
            name=data['name'],
            description=data.get('description')
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'message': 'Category created successfully',
            'category_id': category.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@articles_bp.route('/stock-adjustment', methods=['POST'])
@jwt_required()
def adjust_stock():
    """Adjust article stock quantity"""
    try:
        company_id = get_user_company_id()
        if not company_id:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if not data.get('article_id') or 'adjustment' not in data:
            return jsonify({'error': 'Article ID and adjustment amount required'}), 400
        
        article = Article.query.filter_by(
            id=data['article_id'], company_id=company_id
        ).first()
        
        if not article:
            return jsonify({'error': 'Article not found'}), 404
        
        # Apply adjustment
        new_quantity = float(article.stock_quantity) + float(data['adjustment'])
        
        if new_quantity < 0:
            return jsonify({'error': 'Stock quantity cannot be negative'}), 400
        
        article.stock_quantity = new_quantity
        db.session.commit()
        
        return jsonify({
            'message': 'Stock adjusted successfully',
            'new_quantity': float(article.stock_quantity)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

