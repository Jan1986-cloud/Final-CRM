#!/usr/bin/env python3
"""
Seed sample customers for the demo company (Demo Installatiebedrijf B.V.).
This script is idempotent and will only add customers if they do not already exist.
Run this script inside the backend project directory.
"""

import sys

from src.main import create_app
from src.models.database import db, Company, Customer


def main():
    app = create_app()
    with app.app_context():
        demo = Company.query.filter_by(name="Demo Installatiebedrijf B.V.").first()
        if not demo:
            print("Demo company not found. Please ensure the database is initialized.")
            sys.exit(1)

        samples = [
            {
                "company_name": "Voorbeeld Klant 1",
                "contact_person": "Piet Klaassen",
                "email": "klant1@voorbeeld.nl",
                "city": "Amsterdam",
            },
            {
                "company_name": "Voorbeeld Klant 2",
                "contact_person": "Anna de Jong",
                "email": "klant2@voorbeeld.nl",
                "city": "Rotterdam",
            },
        ]

        added = 0
        for data in samples:
            exists = (
                Customer.query
                .filter_by(company_id=demo.id, company_name=data["company_name"])
                .first()
            )
            if exists:
                print(f"Skipping existing customer: {data['company_name']}")
                continue

            customer = Customer(
                company_id=demo.id,
                company_name=data["company_name"],
                contact_person=data.get("contact_person"),
                email=data.get("email"),
                city=data.get("city"),
            )
            db.session.add(customer)
            added += 1

        if added:
            db.session.commit()
            print(f"Seeded {added} sample customer(s) for Demo Installatiebedrijf B.V.")
        else:
            print("No new customers added. All samples already exist.")


if __name__ == '__main__':
    main()