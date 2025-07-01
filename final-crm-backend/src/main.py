import os
import sys
from datetime import timedelta
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import models and routes
from src.models.database import db
from src.routes.auth import auth_bp
from src.routes.companies import companies_bp
from src.routes.customers import customers_bp
from src.routes.articles import articles_bp
from src.routes.quotes import quotes_bp
from src.routes.work_orders import work_orders_bp
from src.routes.invoices import invoices_bp
from src.routes.documents import documents_bp
from src.routes.excel import excel_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'final-crm-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Database configuration
database_url = os.getenv('DATABASE_URL')
if database_url:
    # PostgreSQL for production
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # SQLite for development
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
CORS(app, origins="*")
jwt = JWTManager(app)
db.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(companies_bp, url_prefix='/api/companies')
app.register_blueprint(customers_bp, url_prefix='/api/customers')
app.register_blueprint(articles_bp, url_prefix='/api/articles')
app.register_blueprint(quotes_bp, url_prefix='/api/quotes')
app.register_blueprint(work_orders_bp, url_prefix='/api/work-orders')
app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
app.register_blueprint(documents_bp, url_prefix='/api/documents')
app.register_blueprint(excel_bp, url_prefix='/api/excel')

# Create database tables
with app.app_context():
    db.create_all()

# Health check endpoint
@app.route('/health')
def health_check():
    return {'status': 'healthy', 'service': 'Final CRM API'}, 200

# Serve frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "Final CRM API is running. Frontend not deployed yet.", 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

