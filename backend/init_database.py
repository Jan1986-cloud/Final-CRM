#!/usr/bin/env python3
"""
Initialize CRM Database
Run this after first deployment to Railway
"""

import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.models.database import db
from src.main import app
from datetime import datetime

def init_database():
    """Initialize database with schema and sample data"""
    
    with app.app_context():
        print("🔧 Creating database tables...")
        db.create_all()
        print("✅ Database tables created!")
        
        # Check if already initialized
        from src.models.database import Company
        if Company.query.first():
            print("ℹ️  Database already contains data, skipping sample data")
            return
        
        print("\n📊 Creating sample data...")
        
        # Create sample company
        from src.models.database import Company, User
        
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
        
        # Create admin user
        admin_user = User(
            company_id=sample_company.id,
            username="admin",
            email="admin@demo.nl",
            first_name="Admin",
            last_name="User",
            role="admin"
        )
        admin_user.set_password("admin123")
        db.session.add(admin_user)
        
        # Create demo user
        demo_user = User(
            company_id=sample_company.id,
            username="demo",
            email="demo@demo.nl",
            first_name="Demo",
            last_name="User",
            role="technician"
        )
        demo_user.set_password("demo123")
        db.session.add(demo_user)
        
        db.session.commit()
        
        print("✅ Sample data created!")
        print("\n📝 Login credentials:")
        print("   Admin: admin@demo.nl / admin123")
        print("   Demo:  demo@demo.nl / demo123")
        
        return True

if __name__ == "__main__":
    try:
        if init_database():
            print("\n🎉 Database initialization completed successfully!")
        else:
            print("\n⚠️  Database was already initialized")
    except Exception as e:
        print(f"\n❌ Error during initialization: {str(e)}")
        sys.exit(1)
