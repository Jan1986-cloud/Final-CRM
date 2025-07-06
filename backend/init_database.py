#!/usr/bin/env python3
"""
Initialize CRM Database with schema and sample data.
Run this after first deployment or container start to seed default users.
"""

import os
import sys
from datetime import datetime

def init_database(app):
    """Initialize database tables and create sample data if database is empty."""
    from src.models.database import db, Company, User

    with app.app_context():
        print("Creating database tables...")
        db.create_all()
        print("Database tables created!")

        # Skip seeding if data already exists
        if Company.query.first():
            print("Database already contains data, skipping sample data")
            return False

        print("\nCreating sample data...")
        # Create sample company
        sample_company = Company(
            name="Demo Installatiebedrijf B.V.",
            address="Demostraat 123",
            postal_code="1234 AB",
            city="Amsterdam",
            phone="+31 20 123 4567",
            email="info@demo-installatie.nl",
            vat_number="NL123456789B01",
            invoice_prefix="F",
            quote_prefix="O",
            workorder_prefix="W"
        )
        db.session.add(sample_company)
        db.session.flush()

        # Create sample users matching README
        users_data = [
            ("admin@bedrijf.nl", "Admin", "User", "admin", "admin123"),
            ("manager@bedrijf.nl", "Manager", "User", "manager", "manager123"),
            ("verkoop@bedrijf.nl", "Sales", "User", "sales", "sales123"),
            ("techniek@bedrijf.nl", "Technician", "User", "technician", "tech123"),
            ("financieel@bedrijf.nl", "Financial", "User", "financial", "finance123"),
        ]
        for email, first, last, role, pwd in users_data:
            user = User(
                company_id=sample_company.id,
                username=email.split('@')[0],
                email=email,
                first_name=first,
                last_name=last,
                role=role,
            )
            user.set_password(pwd)
            db.session.add(user)
        db.session.commit()

        print("Sample data created!\n")
        print("Login credentials:")
        for email, first, last, role, pwd in users_data:
            print(f"   {role.title()}: {email} / {pwd}")
        return True

if __name__ == "__main__":
    # Standalone execution: create app and seed data
    from src.main import create_app
    try:
        app = create_app()
        if init_database(app):
            print("\nDatabase initialization completed successfully!")
        else:
            print("\nDatabase was already initialized")
    except Exception as e:
        print(f"\nError during initialization: {e}")
        sys.exit(1)