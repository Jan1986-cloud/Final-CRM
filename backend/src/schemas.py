from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, auto_field
from marshmallow import fields, validate
from src.models.database import (
    Customer, Article, ArticleCategory, Location, 
    Quote, QuoteLine, Invoice, InvoiceItem, 
    WorkOrder, WorkOrderLine, WorkOrderTimeEntry
)

class LocationSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Location
        load_instance = True
        include_fk = True

    name = auto_field(required=True, validate=validate.Length(min=2, max=255))
    address = auto_field(required=True, validate=validate.Length(min=5, max=255))

class CustomerSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Customer
        load_instance = True
        include_fk = True
        exclude = ("created_at", "updated_at", "created_by_id")

    company_name = auto_field(required=True, validate=validate.Length(min=2, max=255))
    email = auto_field(required=True, validate=validate.Email())
    locations = fields.Nested(LocationSchema, many=True, required=False)
    company_id = auto_field(dump_only=True)

class ArticleCategorySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ArticleCategory
        load_instance = True
        include_fk = True

    name = auto_field(required=True, validate=validate.Length(min=2, max=255))

class ArticleSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Article
        load_instance = True
        include_fk = True
        exclude = ("created_at", "updated_at", "created_by_id")

    code = auto_field(required=True, validate=validate.Length(min=1, max=100))
    name = auto_field(required=True, validate=validate.Length(min=2, max=255))
    selling_price = auto_field(required=True, validate=validate.Range(min=0))
    vat_rate = auto_field(required=True, validate=validate.Range(min=0, max=100))

class QuoteLineSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = QuoteLine
        load_instance = True
        include_fk = True

    description = auto_field(required=True)
    quantity = auto_field(required=True, validate=validate.Range(min=0))
    unit_price = auto_field(required=True, validate=validate.Range(min=0))

class QuoteSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Quote
        load_instance = True
        include_fk = True
        exclude = ("created_at", "updated_at", "created_by_id", "company_id", "quote_number")

    customer_id = auto_field(required=True)
    title = auto_field(required=True, validate=validate.Length(min=3))
    lines = fields.Nested(QuoteLineSchema, many=True, required=True, validate=validate.Length(min=1))

class InvoiceItemSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = InvoiceItem
        load_instance = True
        include_fk = True

    description = auto_field(required=True)
    quantity = auto_field(required=True, validate=validate.Range(min=0))
    unit_price = auto_field(required=True, validate=validate.Range(min=0))

class InvoiceSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Invoice
        load_instance = True
        include_fk = True
        exclude = ("created_at", "updated_at", "created_by_id", "company_id", "invoice_number")

    customer_id = auto_field(required=True)
    items = fields.Nested(InvoiceItemSchema, many=True, required=True, validate=validate.Length(min=1))

class WorkOrderLineSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = WorkOrderLine
        load_instance = True
        include_fk = True

    description = auto_field(required=True)
    quantity = auto_field(required=True, validate=validate.Range(min=0))
    unit_price = auto_field(required=True, validate=validate.Range(min=0))

class WorkOrderTimeEntrySchema(SQLAlchemyAutoSchema):
    class Meta:
        model = WorkOrderTimeEntry
        load_instance = True
        include_fk = True
    
    hours = auto_field(required=True, validate=validate.Range(min=0))
    description = auto_field(required=True)

class WorkOrderSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = WorkOrder
        load_instance = True
        include_fk = True
        exclude = ("created_at", "updated_at", "created_by_id", "company_id", "work_order_number")

    customer_id = auto_field(required=True)
    title = auto_field(required=True, validate=validate.Length(min=3))
    lines = fields.Nested(WorkOrderLineSchema, many=True, required=False)
    time_entries = fields.Nested(WorkOrderTimeEntrySchema, many=True, required=False)
