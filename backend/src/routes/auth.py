from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import uuid
from src.models.database import User
from src.models.database import db, Company
from datetime import datetime

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register new user and company"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid input"}), 400

        required_fields = [
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "company_name",
        ]
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        if len(data["password"]) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        if User.query.filter_by(email=data["email"]).first():
            return jsonify({"error": "Email already registered"}), 400

        if User.query.filter_by(username=data["username"]).first():
            return jsonify({"error": "Username already taken"}), 400

        company = Company(
            name=data["company_name"],
            address=data.get("company_address"),
            postal_code=data.get("company_postal_code"),
            city=data.get("company_city"),
            phone=data.get("company_phone"),
            email=data.get("company_email"),
            vat_number=data.get("company_vat_number"),
        )
        db.session.add(company)
        db.session.flush()

        user = User(
            company_id=company.id,
            username=data["username"],
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            role="admin",
        )
        user.set_password(data["password"])

        db.session.add(user)
        db.session.commit()

        token = create_access_token(
            identity=str(user.id), additional_claims={"company_id": company.id}
        )

        return (
            jsonify(
                {
                    "message": "Registration successful",
                    "token": token,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "full_name": user.full_name,
                        "role": user.role,
                        "company_id": user.company_id,
                        "company_name": company.name,
                    },
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid input"}), 400

        # The contract allows for either email or username
        login_identifier = data.get("email") or data.get("username")
        password = data.get("password")

        if not login_identifier or not password:
            return jsonify({"error": "Email/username and password are required"}), 400

        # Find the user by either email or username
        user = User.query.filter(
            (User.email == login_identifier) | (User.username == login_identifier)
        ).first()

        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401

        if not getattr(user, "is_active", True):
            return jsonify({"error": "Account is deactivated"}), 401

        if hasattr(user, "last_login"):
            user.last_login = datetime.utcnow()
        db.session.commit()

        token = create_access_token(
            identity=str(user.id), additional_claims={"company_id": user.company_id}
        )

        return (
            jsonify(
                {
                    "message": "Login successful",
                    "token": token,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "full_name": user.full_name,
                        "role": user.role,
                        "company_id": user.company_id,
                        "company_name": user.company.name,
                    },
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Client-side tokens are stateless; this endpoint exists for consistency."""
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current user info"""
    try:
        identity = get_jwt_identity()
        try:
            user_id = uuid.UUID(identity)
        except (TypeError, ValueError):
            user_id = identity
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        return (
            jsonify(
                {
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "full_name": user.full_name,
                        "role": user.role,
                        "company_id": user.company_id,
                        "company_name": user.company.name,
                        "last_login": (
                            user.last_login.isoformat()
                            if hasattr(user, "last_login") and user.last_login
                            else None
                        ),
                    }
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid input"}), 400

        if not data.get("current_password") or not data.get("new_password"):
            return jsonify({"error": "Current password and new password required"}), 400

        if not user.check_password(data["current_password"]):
            return jsonify({"error": "Current password is incorrect"}), 400

        if len(data["new_password"]) < 6:
            return jsonify({"error": "New password must be at least 6 characters"}), 400

        user.set_password(data["new_password"])
        db.session.commit()

        return jsonify({"message": "Password changed successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
