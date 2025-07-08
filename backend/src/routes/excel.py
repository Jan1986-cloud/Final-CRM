from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, User, Customer, Article
import pandas as pd
import tempfile
import os
from datetime import datetime
from sqlalchemy.exc import IntegrityError

excel_bp = Blueprint('excel', __name__)

@excel_bp.route('/customers/export', methods=['GET'])
@jwt_required()
def export_customers():
    """Export customers to Excel file"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Get all customers for the company
        customers = Customer.query.filter_by(company_id=user.company_id).all()
        
        # Prepare data for Excel
        customer_data = []
        for customer in customers:
            customer_data.append({
                'ID': customer.id,
                'Naam': customer.name,
                'Email': customer.email,
                'Telefoon': customer.phone,
                'Adres': customer.address,
                'Stad': customer.city,
                'Postcode': customer.postal_code,
                'Land': customer.country,
                'BTW Nummer': customer.vat_number,
                'Contactpersoon': customer.contact_person,
                'Notities': customer.notes,
                'Aangemaakt': customer.created_at.strftime('%d-%m-%Y') if customer.created_at else ''
            })
        
        # Create DataFrame
        df = pd.DataFrame(customer_data)
        
        # Create temporary Excel file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            df.to_excel(temp_file.name, index=False, sheet_name='Klanten')
            temp_file_path = temp_file.name
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'klanten_export_{timestamp}.xlsx'
        
        return send_file(
            temp_file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@excel_bp.route('/customers/import', methods=['POST'])
@jwt_required()
def import_customers():
    """Import customers from Excel file"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Check permissions
        if user.role not in ['admin', 'manager', 'sales']:
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        # Check if file is uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'File must be Excel format (.xlsx or .xls)'}), 400
            
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            file.save(temp_file.name)
            temp_file_path = temp_file.name
        
        try:
            # Read Excel file
            df = pd.read_excel(temp_file_path)
            
            # Validate required columns
            required_columns = ['Naam', 'Email']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'Missing required columns: {", ".join(missing_columns)}'}), 400
            
            # Process each row
            imported_count = 0
            updated_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Check if customer exists (by email)
                    existing_customer = Customer.query.filter_by(
                        email=row['Email'],
                        company_id=user.company_id
                    ).first()
                    
                    if existing_customer:
                        # Update existing customer
                        existing_customer.name = row['Naam']
                        existing_customer.phone = row.get('Telefoon', '')
                        existing_customer.address = row.get('Adres', '')
                        existing_customer.city = row.get('Stad', '')
                        existing_customer.postal_code = row.get('Postcode', '')
                        existing_customer.country = row.get('Land', 'Netherlands')
                        existing_customer.vat_number = row.get('BTW Nummer', '')
                        existing_customer.contact_person = row.get('Contactpersoon', '')
                        existing_customer.notes = row.get('Notities', '')
                        updated_count += 1
                    else:
                        # Create new customer
                        customer = Customer(
                            company_id=user.company_id,
                            name=row['Naam'],
                            email=row['Email'],
                            phone=row.get('Telefoon', ''),
                            address=row.get('Adres', ''),
                            city=row.get('Stad', ''),
                            postal_code=row.get('Postcode', ''),
                            country=row.get('Land', 'Netherlands'),
                            vat_number=row.get('BTW Nummer', ''),
                            contact_person=row.get('Contactpersoon', ''),
                            notes=row.get('Notities', ''),
                            created_by=current_user_id
                        )
                        db.session.add(customer)
                        imported_count += 1
                        
                except Exception as row_error:
                    errors.append(f'Row {index + 2}: {str(row_error)}')
                    continue
            
            # Commit changes
            db.session.commit()
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            return jsonify({
                'message': 'Import completed',
                'imported': imported_count,
                'updated': updated_count,
                'errors': errors
            }), 200
            
        except Exception as e:
            db.session.rollback()
            os.unlink(temp_file_path)
            return jsonify({'error': f'Error processing Excel file: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@excel_bp.route('/articles/export', methods=['GET'])
@jwt_required()
def export_articles():
    """Export articles to Excel file"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Get all articles for the company
        articles = Article.query.filter_by(company_id=user.company_id).all()
        
        # Prepare data for Excel
        article_data = []
        for article in articles:
            article_data.append({
                'ID': article.id,
                'Artikelcode': article.article_code,
                'Naam': article.name,
                'Beschrijving': article.description,
                'Categorie': article.category,
                'Eenheid': article.unit,
                'Inkoopprijs': float(article.purchase_price) if article.purchase_price else 0,
                'Verkoopprijs': float(article.selling_price) if article.selling_price else 0,
                'BTW Percentage': float(article.vat_rate) if article.vat_rate else 21,
                'Voorraad': article.stock_quantity or 0,
                'Minimum Voorraad': article.minimum_stock or 0,
                'Leverancier': article.supplier,
                'Actief': 'Ja' if article.is_active else 'Nee',
                'Aangemaakt': article.created_at.strftime('%d-%m-%Y') if article.created_at else ''
            })
        
        # Create DataFrame
        df = pd.DataFrame(article_data)
        
        # Create temporary Excel file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            df.to_excel(temp_file.name, index=False, sheet_name='Artikelen')
            temp_file_path = temp_file.name
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'artikelen_export_{timestamp}.xlsx'
        
        return send_file(
            temp_file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@excel_bp.route('/articles/import', methods=['POST'])
@jwt_required()
def import_articles():
    """Import articles from Excel file"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.company_id:
            return jsonify({'error': 'User not found or not associated with company'}), 404
            
        # Check permissions
        if user.role not in ['admin', 'manager']:
            return jsonify({'error': 'Insufficient permissions'}), 403
            
        # Check if file is uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({'error': 'File must be Excel format (.xlsx or .xls)'}), 400
            
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            file.save(temp_file.name)
            temp_file_path = temp_file.name
        
        try:
            # Read Excel file
            df = pd.read_excel(temp_file_path)
            
            # Validate required columns
            required_columns = ['Artikelcode', 'Naam', 'Verkoopprijs']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return jsonify({'error': f'Missing required columns: {", ".join(missing_columns)}'}), 400
            
            # Process each row
            imported_count = 0
            updated_count = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Check if article exists (by article_code)
                    existing_article = Article.query.filter_by(
                        article_code=row['Artikelcode'],
                        company_id=user.company_id
                    ).first()
                    
                    if existing_article:
                        # Update existing article
                        existing_article.name = row['Naam']
                        existing_article.description = row.get('Beschrijving', '')
                        existing_article.category = row.get('Categorie', '')
                        existing_article.unit = row.get('Eenheid', 'stuks')
                        existing_article.purchase_price = float(row.get('Inkoopprijs', 0))
                        existing_article.selling_price = float(row['Verkoopprijs'])
                        existing_article.vat_rate = float(row.get('BTW Percentage', 21))
                        existing_article.stock_quantity = int(row.get('Voorraad', 0))
                        existing_article.minimum_stock = int(row.get('Minimum Voorraad', 0))
                        existing_article.supplier = row.get('Leverancier', '')
                        existing_article.is_active = row.get('Actief', 'Ja').lower() in ['ja', 'yes', 'true', '1']
                        updated_count += 1
                    else:
                        # Create new article
                        article = Article(
                            company_id=user.company_id,
                            article_code=row['Artikelcode'],
                            name=row['Naam'],
                            description=row.get('Beschrijving', ''),
                            category=row.get('Categorie', ''),
                            unit=row.get('Eenheid', 'stuks'),
                            purchase_price=float(row.get('Inkoopprijs', 0)),
                            selling_price=float(row['Verkoopprijs']),
                            vat_rate=float(row.get('BTW Percentage', 21)),
                            stock_quantity=int(row.get('Voorraad', 0)),
                            minimum_stock=int(row.get('Minimum Voorraad', 0)),
                            supplier=row.get('Leverancier', ''),
                            is_active=row.get('Actief', 'Ja').lower() in ['ja', 'yes', 'true', '1'],
                            created_by=current_user_id
                        )
                        db.session.add(article)
                        imported_count += 1
                        
                except Exception as row_error:
                    errors.append(f'Row {index + 2}: {str(row_error)}')
                    continue
            
            # Commit changes
            db.session.commit()
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            return jsonify({
                'message': 'Import completed',
                'imported': imported_count,
                'updated': updated_count,
                'errors': errors
            }), 200
            
        except Exception as e:
            db.session.rollback()
            os.unlink(temp_file_path)
            return jsonify({'error': f'Error processing Excel file: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@excel_bp.route('/templates/customers', methods=['GET'])
@jwt_required()
def download_customer_template():
    """Download Excel template for customer import"""
    try:
        # Create sample data
        template_data = [{
            'Naam': 'Voorbeeld Bedrijf B.V.',
            'Email': 'info@voorbeeldbedrijf.nl',
            'Telefoon': '010-1234567',
            'Adres': 'Voorbeeldstraat 123',
            'Stad': 'Rotterdam',
            'Postcode': '3000 AB',
            'Land': 'Netherlands',
            'BTW Nummer': 'NL123456789B01',
            'Contactpersoon': 'Jan de Vries',
            'Notities': 'Belangrijke klant'
        }]
        
        # Create DataFrame
        df = pd.DataFrame(template_data)
        
        # Create temporary Excel file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            df.to_excel(temp_file.name, index=False, sheet_name='Klanten Template')
            temp_file_path = temp_file.name
        
        return send_file(
            temp_file_path,
            as_attachment=True,
            download_name='klanten_import_template.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@excel_bp.route('/templates/articles', methods=['GET'])
@jwt_required()
def download_article_template():
    """Download Excel template for article import"""
    try:
        # Create sample data
        template_data = [{
            'Artikelcode': 'ART001',
            'Naam': 'Voorbeeld Artikel',
            'Beschrijving': 'Beschrijving van het artikel',
            'Categorie': 'Installatiemateriaal',
            'Eenheid': 'stuks',
            'Inkoopprijs': 10.50,
            'Verkoopprijs': 15.75,
            'BTW Percentage': 21,
            'Voorraad': 100,
            'Minimum Voorraad': 10,
            'Leverancier': 'Leverancier B.V.',
            'Actief': 'Ja'
        }]
        
        # Create DataFrame
        df = pd.DataFrame(template_data)
        
        # Create temporary Excel file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            df.to_excel(temp_file.name, index=False, sheet_name='Artikelen Template')
            temp_file_path = temp_file.name
        
        return send_file(
            temp_file_path,
            as_attachment=True,
            download_name='artikelen_import_template.xlsx',
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

