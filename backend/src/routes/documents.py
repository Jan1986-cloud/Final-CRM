from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.database import db, User, Customer, Quote, WorkOrder, Invoice, Company, DocumentTemplate
import os
import json
import tempfile
from datetime import datetime
import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

documents_bp = Blueprint("documents", __name__)

# Google Docs template IDs (these would be configured per company)
TEMPLATE_IDS = {
    "quote": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",  # Example template ID
    "work_order": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "invoice": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "invoice_combined": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
}


def get_google_docs_service():
    """Get Google Docs service with credentials"""
    try:
        # In production, this would use proper OAuth2 flow
        # For now, using service account credentials
        credentials_json = os.getenv("GOOGLE_API_CREDENTIALS")
        if not credentials_json:
            return None

        credentials_info = json.loads(credentials_json)
        credentials = Credentials.from_service_account_info(credentials_info)
        service = build("docs", "v1", credentials=credentials)
        return service
    except Exception as e:
        print(f"Error creating Google Docs service: {e}")
        return None


def get_google_drive_service():
    """Get Google Drive service with credentials"""
    try:
        credentials_json = os.getenv("GOOGLE_API_CREDENTIALS")
        if not credentials_json:
            return None

        credentials_info = json.loads(credentials_json)
        credentials = Credentials.from_service_account_info(credentials_info)
        service = build("drive", "v3", credentials=credentials)
        return service
    except Exception as e:
        print(f"Error creating Google Drive service: {e}")
        return None


def replace_placeholders_in_doc(service, document_id, replacements):
    """Replace placeholders in Google Doc with actual values"""
    try:
        # Create batch update requests
        requests_list = []

        for placeholder, value in replacements.items():
            requests_list.append(
                {
                    "replaceAllText": {
                        "containsText": {
                            "text": f"{{{{{placeholder}}}}}",
                            "matchCase": False,
                        },
                        "replaceText": str(value) if value is not None else "",
                    }
                }
            )

        # Execute batch update
        if requests_list:
            service.documents().batchUpdate(
                documentId=document_id, body={"requests": requests_list}
            ).execute()

        return True
    except Exception as e:
        print(f"Error replacing placeholders: {e}")
        return False


def export_doc_as_pdf(drive_service, document_id):
    """Export Google Doc as PDF"""
    try:
        # Export as PDF
        response = (
            drive_service.files()
            .export(fileId=document_id, mimeType="application/pdf")
            .execute()
        )

        return response
    except Exception as e:
        print(f"Error exporting PDF: {e}")
        return None


@documents_bp.route("/templates", methods=["GET"])
@jwt_required()
def get_templates():
    """Get available document templates"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.company_id:
            return (
                jsonify({"error": "User not found or not associated with company"}),
                404,
            )

        templates = [
            {
                "id": "quote",
                "name": "Offerte",
                "description": "Standaard offerte template",
                "type": "quote",
            },
            {
                "id": "work_order",
                "name": "Werkbon",
                "description": "Werkbon voor uitgevoerd werk",
                "type": "work_order",
            },
            {
                "id": "invoice",
                "name": "Factuur",
                "description": "Standaard factuur template",
                "type": "invoice",
            },
            {
                "id": "invoice_combined",
                "name": "Factuur Gecombineerd",
                "description": "Factuur gebaseerd op werkbonnen",
                "type": "invoice",
            },
        ]

        return jsonify({"templates": templates}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@documents_bp.route("/templates/<template_id>", methods=["DELETE"])
@jwt_required()
def delete_template(template_id):
    """Delete a document template"""
    try:
        template = DocumentTemplate.query.get(template_id)
        if not template:
            return jsonify({"error": "Template not found"}), 404
        db.session.delete(template)
        db.session.commit()
        return jsonify({"message": f"Template {template_id} deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@documents_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate_document():
    """Generate document from template"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.company_id:
            return (
                jsonify({"error": "User not found or not associated with company"}),
                404,
            )

        data = request.get_json()
        template_type = data.get("template_type")
        entity_id = data.get("entity_id")

        if not template_type or not entity_id:
            return jsonify({"error": "template_type and entity_id are required"}), 400

        # Get Google services
        docs_service = get_google_docs_service()
        drive_service = get_google_drive_service()

        if not docs_service or not drive_service:
            return jsonify({"error": "Google API services not available"}), 500

        # Get template ID
        template_id = TEMPLATE_IDS.get(template_type)
        if not template_id:
            return jsonify({"error": "Template not found"}), 404

        # Get entity data based on type
        entity_data = None
        if template_type == "quote":
            entity_data = Quote.query.filter_by(
                id=entity_id, company_id=user.company_id
            ).first()
        elif template_type == "work_order":
            entity_data = WorkOrder.query.filter_by(
                id=entity_id, company_id=user.company_id
            ).first()
        elif template_type in ["invoice", "invoice_combined"]:
            entity_data = Invoice.query.filter_by(
                id=entity_id, company_id=user.company_id
            ).first()

        if not entity_data:
            return jsonify({"error": "Entity not found"}), 404

        # Copy template
        copy_request = {
            "name": f'{template_type}_{entity_data.id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        }

        copied_doc = (
            drive_service.files().copy(fileId=template_id, body=copy_request).execute()
        )

        document_id = copied_doc["id"]

        # Prepare replacement data
        replacements = prepare_replacement_data(
            entity_data, template_type, user.company
        )

        # Replace placeholders
        if replace_placeholders_in_doc(docs_service, document_id, replacements):
            # Export as PDF
            pdf_content = export_doc_as_pdf(drive_service, document_id)

            if pdf_content:
                # Save PDF temporarily
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=".pdf"
                ) as temp_file:
                    temp_file.write(pdf_content)
                    temp_file_path = temp_file.name

                # Clean up Google Doc copy (optional)
                # drive_service.files().delete(fileId=document_id).execute()

                return (
                    jsonify(
                        {
                            "document_id": document_id,
                            "pdf_url": f"/api/documents/download/{document_id}",
                            "google_doc_url": f"https://docs.google.com/document/d/{document_id}/edit",
                            "message": "Document generated successfully",
                        }
                    ),
                    200,
                )
            else:
                return jsonify({"error": "Failed to export PDF"}), 500
        else:
            return jsonify({"error": "Failed to replace placeholders"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def prepare_replacement_data(entity, template_type, company):
    """Prepare data for template replacement"""
    replacements = {}

    # Company data
    replacements.update(
        {
            "company_name": company.name,
            "company_address": company.address,
            "company_city": company.city,
            "company_postal_code": company.postal_code,
            "company_phone": company.phone,
            "company_email": company.email,
            "company_vat_number": company.vat_number,
            "company_chamber_of_commerce": company.chamber_of_commerce,
            "company_bank_account": company.bank_account,
        }
    )

    # Customer data
    if hasattr(entity, "customer") and entity.customer:
        customer = entity.customer
        replacements.update(
            {
                "customer_name": customer.name,
                "customer_address": customer.address,
                "customer_city": customer.city,
                "customer_postal_code": customer.postal_code,
                "customer_phone": customer.phone,
                "customer_email": customer.email,
            }
        )

    # Entity-specific data
    if template_type == "quote":
        replacements.update(
            {
                "quote_number": entity.quote_number,
                "quote_date": (
                    entity.quote_date.strftime("%d-%m-%Y") if entity.quote_date else ""
                ),
                "valid_until": (
                    entity.valid_until.strftime("%d-%m-%Y")
                    if entity.valid_until
                    else ""
                ),
                "subtotal": f"€ {entity.subtotal:.2f}" if entity.subtotal else "€ 0.00",
                "vat_amount": (
                    f"€ {entity.vat_amount:.2f}" if entity.vat_amount else "€ 0.00"
                ),
                "total_amount": (
                    f"€ {entity.total_amount:.2f}" if entity.total_amount else "€ 0.00"
                ),
                "notes": entity.notes or "",
            }
        )

        # Quote items
        if entity.items:
            items_text = ""
            for i, item in enumerate(entity.items, 1):
                items_text += f"{i}. {item.description} - {item.quantity} x € {item.unit_price:.2f} = € {item.line_total:.2f}\n"
            replacements["quote_items"] = items_text

    elif template_type == "work_order":
        replacements.update(
            {
                "work_order_number": entity.work_order_number,
                "work_date": (
                    entity.work_date.strftime("%d-%m-%Y") if entity.work_date else ""
                ),
                "start_time": (
                    entity.start_time.strftime("%H:%M") if entity.start_time else ""
                ),
                "end_time": (
                    entity.end_time.strftime("%H:%M") if entity.end_time else ""
                ),
                "hours_worked": (
                    str(entity.hours_worked) if entity.hours_worked else "0"
                ),
                "description": entity.description or "",
                "notes": entity.notes or "",
            }
        )

        # Work order items
        if entity.items:
            items_text = ""
            for i, item in enumerate(entity.items, 1):
                items_text += f"{i}. {item.description} - {item.quantity} x € {item.unit_price:.2f} = € {item.line_total:.2f}\n"
            replacements["work_order_items"] = items_text

    elif template_type in ["invoice", "invoice_combined"]:
        replacements.update(
            {
                "invoice_number": entity.invoice_number,
                "invoice_date": (
                    entity.invoice_date.strftime("%d-%m-%Y")
                    if entity.invoice_date
                    else ""
                ),
                "due_date": (
                    entity.due_date.strftime("%d-%m-%Y") if entity.due_date else ""
                ),
                "payment_terms": (
                    f"{entity.payment_terms} dagen"
                    if entity.payment_terms
                    else "30 dagen"
                ),
                "subtotal": f"€ {entity.subtotal:.2f}" if entity.subtotal else "€ 0.00",
                "vat_amount": (
                    f"€ {entity.vat_amount:.2f}" if entity.vat_amount else "€ 0.00"
                ),
                "total_amount": (
                    f"€ {entity.total_amount:.2f}" if entity.total_amount else "€ 0.00"
                ),
                "notes": entity.notes or "",
            }
        )

        # Invoice items
        if entity.items:
            items_text = ""
            for i, item in enumerate(entity.items, 1):
                items_text += f"{i}. {item.description} - {item.quantity} x € {item.unit_price:.2f} = € {item.line_total:.2f}\n"
            replacements["invoice_items"] = items_text

    # Current date
    replacements["current_date"] = datetime.now().strftime("%d-%m-%Y")

    return replacements


@documents_bp.route("/download/<document_id>", methods=["GET"])
@jwt_required()
def download_document(document_id):
    """Download generated document as PDF"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.company_id:
            return (
                jsonify({"error": "User not found or not associated with company"}),
                404,
            )

        # Get Google Drive service
        drive_service = get_google_drive_service()
        if not drive_service:
            return jsonify({"error": "Google API service not available"}), 500

        # Export document as PDF
        pdf_content = export_doc_as_pdf(drive_service, document_id)

        if pdf_content:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                temp_file.write(pdf_content)
                temp_file_path = temp_file.name

            return send_file(
                temp_file_path,
                as_attachment=True,
                download_name=f"document_{document_id}.pdf",
                mimetype="application/pdf",
            )
        else:
            return jsonify({"error": "Failed to export document"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@documents_bp.route("/preview/<template_type>", methods=["POST"])
@jwt_required()
def preview_template():
    """Preview template with sample data"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.company_id:
            return (
                jsonify({"error": "User not found or not associated with company"}),
                404,
            )

        # Return sample template structure
        template_type = request.view_args["template_type"]

        sample_data = {
            "quote": {
                "fields": [
                    "company_name",
                    "company_address",
                    "customer_name",
                    "quote_number",
                    "quote_date",
                    "total_amount",
                    "quote_items",
                ],
                "sample_values": {
                    "company_name": user.company.name,
                    "quote_number": "O2024-0001",
                    "quote_date": datetime.now().strftime("%d-%m-%Y"),
                    "total_amount": "€ 1,250.00",
                },
            },
            "work_order": {
                "fields": [
                    "company_name",
                    "customer_name",
                    "work_order_number",
                    "work_date",
                    "hours_worked",
                    "description",
                ],
                "sample_values": {
                    "company_name": user.company.name,
                    "work_order_number": "W2024-0001",
                    "work_date": datetime.now().strftime("%d-%m-%Y"),
                    "hours_worked": "4.5",
                },
            },
            "invoice": {
                "fields": [
                    "company_name",
                    "customer_name",
                    "invoice_number",
                    "invoice_date",
                    "due_date",
                    "total_amount",
                    "invoice_items",
                ],
                "sample_values": {
                    "company_name": user.company.name,
                    "invoice_number": "F2024-0001",
                    "invoice_date": datetime.now().strftime("%d-%m-%Y"),
                    "total_amount": "€ 1,512.50",
                },
            },
        }

        return jsonify(sample_data.get(template_type, {})), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
