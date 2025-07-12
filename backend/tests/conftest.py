import pytest
import uuid
from src.main import create_app
from src.models.database import db, Company, User
from flask_jwt_extended import create_access_token

@pytest.fixture(scope='function')
def app():
    """Create and configure a new app instance for each test."""
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'SECRET_KEY': 'test-secret-key',
        'JWT_SECRET_KEY': 'test-jwt-secret-key',
    })
    yield app

@pytest.fixture(scope='function')
def db_session(app):
    """Create a clean database session for each test."""
    with app.app_context():
        db.create_all()
        yield db.session
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def auth_headers(db_session, app):
    """
    Factory fixture to create users with specific roles and return auth headers.
    Creates a default company and users on first call.
    """
    _users = {}
    _company_id = None

    def _create_user_and_get_headers(role='admin'):
        nonlocal _company_id
        if role in _users:
            return _users[role]

        with app.app_context():
            if not _company_id:
                company = Company(name="Test Bedrijf B.V.")
                db_session.add(company)
                db_session.commit()
                _company_id = company.id

            user = User(
                company_id=_company_id,
                username=f'{role}user',
                email=f'{role}@test.com',
                first_name=role.capitalize(),
                last_name='User',
                role=role
            )
            user.set_password('password123')
            db_session.add(user)
            db_session.commit()

            identity = {
                "id": str(user.id),
                "company_id": str(user.company_id),
                "role": user.role,
            }
            access_token = create_access_token(identity=user.id, additional_claims=identity)
            headers = {
                'Authorization': f'Bearer {access_token}'
            }
            _users[role] = headers
            return headers

    return _create_user_and_get_headers