import os
from datetime import timedelta

# Load environment variables from .env (search parent directories)
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

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


def create_app(config_override=None):
    """Application factory for the Final CRM API."""
    app = Flask(
        __name__, static_folder=os.path.join(os.path.dirname(__file__), 'static')
    )

    # Default configuration
    app.config.from_mapping(
        SECRET_KEY=os.getenv('SECRET_KEY'),
        JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY'),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )

    if config_override:
        app.config.update(config_override)
    else:
        # Production/Development configuration
        secret_key = os.getenv('SECRET_KEY')
        jwt_secret_key = os.getenv('JWT_SECRET_KEY')
        frontend_url = os.getenv('FRONTEND_URL')
        if not all([secret_key, jwt_secret_key, frontend_url]):
            raise ValueError(
                'Missing critical environment variables: SECRET_KEY, JWT_SECRET_KEY, or FRONTEND_URL'
            )

        pg_host = os.getenv('PGHOST')
        pg_port = os.getenv('PGPORT')
        pg_user = os.getenv('PGUSER')
        pg_password = os.getenv('PGPASSWORD')
        pg_database = os.getenv('PGDATABASE')

        if all([pg_host, pg_port, pg_user, pg_password, pg_database]):
            database_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
            app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        else:
            db_folder = os.path.join(os.path.dirname(__file__), 'database')
            os.makedirs(db_folder, exist_ok=True)
            db_path = os.path.join(db_folder, 'app.db')
            app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
            print("CRITICAL WARNING: One or more PG... variables not found. Falling back to SQLite.")

    # Initialize extensions
    CORS(
        app,
        origins=os.getenv('FRONTEND_URL', '*'),
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"]
    )
    jwt = JWTManager(app)

    @jwt.unauthorized_loader
    def _jwt_missing_token(reason):
        return jsonify({'error': reason}), 401

    @jwt.invalid_token_loader
    def _jwt_invalid_token(reason):
        return jsonify({'error': reason}), 401

    db.init_app(app)

    # Register API blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(companies_bp, url_prefix='/api/companies')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(articles_bp, url_prefix='/api/articles')
    app.register_blueprint(quotes_bp, url_prefix='/api/quotes')
    app.register_blueprint(work_orders_bp, url_prefix='/api/work-orders')
    app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(excel_bp, url_prefix='/api/excel')

    with app.app_context():
        if not app.config.get('TESTING'):
            db.create_all()
            print("Database tables checked/created. Automatic seeding is disabled.")

    # Health check
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'Final CRM API'}, 200

    # Serve static frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        static_folder = app.static_folder
        if static_folder and os.path.exists(os.path.join(static_folder, path)):
            return send_from_directory(static_folder, path)
        index_file = os.path.join(static_folder, 'index.html')
        if static_folder and os.path.exists(index_file):
            return send_from_directory(static_folder, 'index.html')
        return 'Final CRM API is running. Frontend not deployed yet.', 200

    @app.cli.command("db_seed")
    def db_seed():
        from src.models.database import Company, User
        if not Company.query.first():
            demo_company = Company(
                name="Demo Installatiebedrijf B.V.",
                address="Demostraat 123",
                postal_code="1234 AB",
                city="Amsterdam",
                phone="+31 20 123 4567",
                email="info@demo-installatie.nl",
                vat_number="NL123456789B01",
                invoice_prefix="F",
                quote_prefix="O",
                workorder_prefix="W",
            )
            db.session.add(demo_company)
            db.session.flush()
            admin_user = User(
                company_id=demo_company.id,
                username="admin",
                email="admin@bedrijf.nl",
                first_name="Admin",
                last_name="User",
                role="admin",
            )
            admin_user.set_password("admin123")
            db.session.add(admin_user)
            db.session.commit()
            print("Seeded default company and admin user: admin@bedrijf.nl / admin123")

    return app


if __name__ == '__main__':
    # This script can be run directly for local development.
    # To run with Gunicorn for production, use a command like:
    # gunicorn --bind 0.0.0.0:8000 "src.main:create_app()"
    app = create_app()
    app.run(debug=True)
