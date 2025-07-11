from flask_sqlalchemy import SQLAlchemy
from .scoped_query import ScopedQuery
from datetime import datetime, date
import uuid
from sqlalchemy.types import TypeDecorator, CHAR
import sqlalchemy as sa
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy(query_class=ScopedQuery)


class GUID(TypeDecorator):
    """Platform-independent GUID type.

    Uses PostgreSQL's UUID type, otherwise CHAR(36).
    """

    impl = CHAR

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(sa.dialects.postgresql.UUID())
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if not isinstance(value, uuid.UUID):
            return str(uuid.UUID(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        # Already a UUID instance
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(255))
    postal_code = db.Column(db.String(20))
    city = db.Column(db.String(100))
    country = db.Column(db.String(100), default="Nederland")
    phone = db.Column(db.String(50))
    email = db.Column(db.String(255))
    website = db.Column(db.String(255))
    vat_number = db.Column(db.String(50))
    chamber_of_commerce = db.Column(db.String(50))
    logo_url = db.Column(db.String(255))
    invoice_prefix = db.Column(db.String(10), default="F")
    quote_prefix = db.Column(db.String(10), default="O")
    workorder_prefix = db.Column(db.String(10), default="W")
    default_vat_rate = db.Column(db.Numeric(5, 2), default=21.00)
    bank_account = db.Column(db.String(50))
    bank_name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    users = db.relationship("User", backref="company", lazy=True)
    customers = db.relationship("Customer", backref="company", lazy=True)
    articles = db.relationship("Article", backref="company", lazy=True)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    role = db.Column(
        db.String(50), nullable=False
    )  # admin, manager, sales, technician, financial
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    company_name = db.Column(db.String(255), nullable=False)
    contact_person = db.Column(db.String(255))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    mobile = db.Column(db.String(50))
    address = db.Column(db.String(255))
    postal_code = db.Column(db.String(20))
    city = db.Column(db.String(100))
    country = db.Column(db.String(100), default="Nederland")
    vat_number = db.Column(db.String(50))
    payment_terms = db.Column(db.Integer, default=30)
    credit_limit = db.Column(db.Numeric(10, 2))
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    locations = db.relationship("Location", backref="customer", lazy=True, cascade="all, delete-orphan")
    quotes = db.relationship("Quote", backref="customer", lazy=True, cascade="all, delete-orphan")
    work_orders = db.relationship("WorkOrder", backref="customer", lazy=True, cascade="all, delete-orphan")
    invoices = db.relationship("Invoice", backref="customer", lazy=True, cascade="all, delete-orphan")


class Location(db.Model):
    __tablename__ = "locations"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = db.Column(GUID(), db.ForeignKey("customers.id", ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    postal_code = db.Column(db.String(20))
    city = db.Column(db.String(100))
    country = db.Column(db.String(100), default="Nederland")
    contact_person = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    access_instructions = db.Column(db.Text)
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ArticleCategory(db.Model):
    __tablename__ = "article_categories"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    articles = db.relationship("Article", backref="category", lazy=True)


class Article(db.Model):
    __tablename__ = "articles"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    category_id = db.Column(GUID(), db.ForeignKey("article_categories.id", ondelete='SET NULL'), index=True)
    code = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    unit = db.Column(db.String(50), default="stuks")
    purchase_price = db.Column(db.Numeric(10, 2))
    selling_price = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Numeric(5, 2), default=21.00)
    stock_quantity = db.Column(db.Numeric(10, 2), default=0)
    min_stock_level = db.Column(db.Numeric(10, 2), default=0)
    supplier = db.Column(db.String(255))
    supplier_code = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        db.UniqueConstraint("company_id", "code", name="unique_company_article_code"),
    )


class Quote(db.Model):
    __tablename__ = "quotes"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    quote_number = db.Column(db.String(50), nullable=False)
    customer_id = db.Column(GUID(), db.ForeignKey("customers.id", ondelete='CASCADE'), nullable=False, index=True)
    location_id = db.Column(GUID(), db.ForeignKey("locations.id", ondelete='SET NULL'), index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    quote_date = db.Column(db.Date, default=date.today)
    valid_until = db.Column(db.Date)
    status = db.Column(
        db.String(50), default="draft"
    )  # draft, sent, accepted, rejected, expired
    subtotal = db.Column(db.Numeric(10, 2), default=0)
    vat_amount = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(10, 2), default=0)
    notes = db.Column(db.Text)
    terms_conditions = db.Column(db.Text)
    created_by = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    lines = db.relationship(
        "QuoteLine", backref="quote", lazy=True, cascade="all, delete-orphan"
    )
    work_orders = db.relationship("WorkOrder", backref="quote", lazy=True)

    __table_args__ = (
        db.UniqueConstraint(
            "company_id", "quote_number", name="unique_company_quote_number"
        ),
    )


class QuoteLine(db.Model):
    __tablename__ = "quote_lines"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    quote_id = db.Column(GUID(), db.ForeignKey("quotes.id", ondelete='CASCADE'), nullable=False, index=True)
    article_id = db.Column(GUID(), db.ForeignKey("articles.id", ondelete='SET NULL'), index=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    sort_order = db.Column(db.Integer, default=0)


class WorkOrder(db.Model):
    __tablename__ = "work_orders"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    work_order_number = db.Column(db.String(50), nullable=False)
    quote_id = db.Column(GUID(), db.ForeignKey("quotes.id", ondelete='SET NULL'), index=True)
    customer_id = db.Column(GUID(), db.ForeignKey("customers.id", ondelete='CASCADE'), nullable=False, index=True)
    location_id = db.Column(GUID(), db.ForeignKey("locations.id", ondelete='SET NULL'), index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    work_date = db.Column(db.Date, default=date.today)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    status = db.Column(
        db.String(50), default="planned"
    )  # planned, in_progress, completed, invoiced
    technician_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    work_performed = db.Column(db.Text)
    customer_signature_url = db.Column(db.Text)
    subtotal = db.Column(db.Numeric(10, 2), default=0)
    vat_amount = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(10, 2), default=0)
    notes = db.Column(db.Text)
    created_by = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    lines = db.relationship(
        "WorkOrderLine", backref="work_order", lazy=True, cascade="all, delete-orphan"
    )
    time_entries = db.relationship(
        "WorkOrderTimeEntry",
        backref="work_order",
        lazy=True,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        db.UniqueConstraint(
            "company_id", "work_order_number", name="unique_company_work_order_number"
        ),
    )


class WorkOrderLine(db.Model):
    __tablename__ = "work_order_lines"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    work_order_id = db.Column(GUID(), db.ForeignKey("work_orders.id", ondelete='CASCADE'), nullable=False, index=True)
    article_id = db.Column(GUID(), db.ForeignKey("articles.id", ondelete='SET NULL'), index=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    sort_order = db.Column(db.Integer, default=0)


class WorkOrderTimeEntry(db.Model):
    __tablename__ = "time_registrations"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='RESTRICT'), nullable=False, index=True)
    work_order_id = db.Column(GUID(), db.ForeignKey("work_orders.id", ondelete='CASCADE'), nullable=False, index=True)
    date = db.Column(db.Date, default=date.today, nullable=False)
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)
    hours = db.Column(db.Numeric(4, 2), nullable=False)
    hourly_rate = db.Column(db.Numeric(10, 2))
    description = db.Column(db.Text, nullable=False)
    is_billable = db.Column(db.Boolean, default=True)
    billable_amount = db.Column(db.Numeric(10, 2), default=0)
    vat_rate = db.Column(db.Numeric(5, 2), default=21.00)
    is_invoiced = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    invoice_number = db.Column(db.String(50), nullable=False)
    customer_id = db.Column(GUID(), db.ForeignKey("customers.id", ondelete='CASCADE'), nullable=False, index=True)
    invoice_type = db.Column(db.String(50), default="standard")  # standard, combined
    invoice_date = db.Column(db.Date, default=date.today)
    due_date = db.Column(db.Date)
    status = db.Column(
        db.String(50), default="draft"
    )  # draft, sent, paid, overdue, cancelled
    subtotal = db.Column(db.Numeric(10, 2), default=0)
    vat_amount = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(10, 2), default=0)
    paid_amount = db.Column(db.Numeric(10, 2), default=0)
    payment_date = db.Column(db.Date)
    payment_reference = db.Column(db.String(255))
    notes = db.Column(db.Text)
    created_by = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    items = db.relationship(
        "InvoiceItem", backref="invoice", lazy=True, cascade="all, delete-orphan"
    )

    __table_args__ = (
        db.UniqueConstraint(
            "company_id", "invoice_number", name="unique_company_invoice_number"
        ),
    )


class InvoiceItem(db.Model):
    __tablename__ = "invoice_lines"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    invoice_id = db.Column(GUID(), db.ForeignKey("invoices.id", ondelete='CASCADE'), nullable=False, index=True)
    work_order_id = db.Column(GUID(), db.ForeignKey("work_orders.id", ondelete='SET NULL'), index=True)
    article_id = db.Column(GUID(), db.ForeignKey("articles.id", ondelete='SET NULL'), index=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    sort_order = db.Column(db.Integer, default=0)

    article = db.relationship("Article", backref="invoice_items", lazy=True)
    work_order = db.relationship("WorkOrder", backref="invoice_items", lazy=True)


class Attachment(db.Model):
    __tablename__ = "attachments"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    entity_type = db.Column(db.String(50), nullable=False)  # work_order, quote, invoice
    entity_id = db.Column(GUID(), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255))
    file_path = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    description = db.Column(db.Text)
    uploaded_by = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class DocumentTemplate(db.Model):
    __tablename__ = "document_templates"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    document_type = db.Column(
        db.String(50), nullable=False
    )  # quote, work_order, invoice, combined_invoice
    google_doc_id = db.Column(db.String(255))
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class AuditLog(db.Model):
    __tablename__ = "audit_log"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), index=True)
    entity_type = db.Column(db.String(50), nullable=False, index=True)
    entity_id = db.Column(GUID(), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)
    old_values = db.Column(db.JSON)
    new_values = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
