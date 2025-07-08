import os
import sys
import logging
from datetime import timedelta

# --- Google Cloud Logging Integration ---
# Do this BEFORE any other imports that might configure logging
try:
    import google.cloud.logging
    client = google.cloud.logging.Client()
    # Attaches a Google Cloud logging handler to the root logger
    client.setup_logging()
    logging.info("Google Cloud Logging initialized successfully.")
except ImportError:
    logging.warning("Google Cloud Logging not found. Using standard logging.")
    logging.basicConfig(level=logging.INFO)


# --- Path and Environment Setup ---
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())
logging.info("App environment loaded.")


# --- Flask and Extension Imports ---
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import create_engine
from sqlalchemy.engine import URL

# --- Local Application Imports ---
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

def get_db_engine(db_user, db_pass, db_name, db_host, cloud_sql_connection_name=None):
    """Creates a SQLAlchemy engine with the Cloud SQL Python Connector."""
    if cloud_sql_connection_name:
        # Production environment (Google Cloud)
        logging.info(f"Connecting to Cloud SQL instance: {cloud_sql_connection_name}")
        from google.cloud.sql.connector import Connector
        
        connector = Connector()
        
        def getconn():
            conn = connector.connect(
                cloud_sql_connection_name,
                "pg8000",
                user=db_user,
                password=db_pass,
                db=db_name,
                ip_type="public" # or "private"
            )
            return conn

        return create_engine("postgresql+pg8000://", getconn)
    else:
        # Local development environment
        logging.info(f"Connecting to local PostgreSQL host: {db_host}")
        db_uri = URL.create(
            "postgresql+psycopg2",
            username=db_user,
            password=db_pass,
            host=db_host,
            database=db_name,
        )
        return create_engine(db_uri)


def create_app():
    """Application factory for the Final CRM API."""
    logging.info("--- Starting Application Factory ---")
    
    app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

    # --- Configuration ---
    logging.info("Loading configuration...")
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a-default-secret-key-for-dev')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'a-default-jwt-key-for-dev')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # --- Database Connection ---
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASS")
    db_name = os.getenv("DB_NAME")
    db_host = os.getenv("DB_HOST") # For local connection
    cloud_sql_connection_name = os.getenv("CLOUD_SQL_CONNECTION_NAME")

    if all([db_user, db_pass, db_name]) and (db_host or cloud_sql_connection_name):
        logging.info("Database credentials found, attempting to configure SQLAlchemy.")
        try:
            engine = get_db_engine(db_user, db_pass, db_name, db_host, cloud_sql_connection_name)
            app.config['SQLALCHEMY_DATABASE_URI'] = engine.url
            logging.info("SQLAlchemy engine created successfully.")
        except Exception as e:
            logging.critical(f"Failed to create SQLAlchemy engine: {e}", exc_info=True)
            raise
    else:
        logging.warning("Database environment variables not fully set. Falling back to SQLite.")
        db_folder = os.path.join(os.path.dirname(__file__), 'database')
        os.makedirs(db_folder, exist_ok=True)
        db_path = os.path.join(db_folder, 'app.db')
        app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'

    db.init_app(app)
    logging.info("Database initialized with Flask app.")

    # --- CORS and JWT Initialization ---
    frontend_url = os.getenv('FRONTEND_URL', "http://localhost:5173")
    CORS(
        app,
        origins=[frontend_url, "http://127.0.0.1:5173"],
        supports_credentials=True
    )
    jwt = JWTManager(app)
    logging.info("CORS and JWT initialized.")

    # --- Register Blueprints ---
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(companies_bp, url_prefix='/api/companies')
    app.register_blueprint(customers_bp, url_prefix='/api/customers')
    app.register_blueprint(articles_bp, url_prefix='/api/articles')
    app.register_blueprint(quotes_bp, url_prefix='/api/quotes')
    app.register_blueprint(work_orders_bp, url_prefix='/api/work-orders')
    app.register_blueprint(invoices_bp, url_prefix='/api/invoices')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(excel_bp, url_prefix='/api/excel')
    logging.info("All API blueprints registered.")

    # --- Health Check Endpoint ---
    @app.route('/health')
    def health_check():
        # Add a database connectivity check for a more robust health check
        try:
            db.session.execute("SELECT 1")
            return {'status': 'healthy', 'database': 'connected'}, 200
        except Exception as e:
            logging.error(f"Health check failed: Database connection error: {e}")
            return {'status': 'unhealthy', 'database': 'disconnected'}, 503

    logging.info("--- Application Factory Finished ---")
    return app

# This block is for local execution only. 
# In Google Cloud Functions, the app is served by a WSGI server like Gunicorn.
if __name__ == '__main__':
    # When running locally, this will use the .env variables to connect to a local DB
    app = create_app()
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)
