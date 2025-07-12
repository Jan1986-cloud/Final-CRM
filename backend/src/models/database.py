from flask_sqlalchemy import SQLAlchemy
from .scoped_query import ScopedQuery
from datetime import datetime, date
import uuid
from sqlalchemy.types import TypeDecorator, CHAR
import sqlalchemy as sa
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy(query_class=ScopedQuery)


class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = CHAR
    cache_ok = True

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
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(255), nullable=False, index=True)
    address = db.Column(db.String(255), nullable=True)
    postal_code = db.Column(db.String(20), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=False, default="Nederland")
    phone = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(255), nullable=True, index=True)
    website = db.Column(db.String(255), nullable=True)
    vat_number = db.Column(db.String(50), nullable=True)
    chamber_of_commerce = db.Column(db.String(50), nullable=True)
    logo_url = db.Column(db.String(255), nullable=True)
    invoice_prefix = db.Column(db.String(10), nullable=False, default="F")
    quote_prefix = db.Column(db.String(10), nullable=False, default="O")
    workorder_prefix = db.Column(db.String(10), nullable=False, default="W")
    default_vat_rate = db.Column(db.Numeric(5, 2), nullable=False, default=21.00)
    bank_account = db.Column(db.String(50), nullable=True)
    bank_name = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = db.relationship("User", backref="company", lazy="joined", cascade="all, delete-orphan")
    customers = db.relationship("Customer", backref="company", lazy="dynamic", cascade="all, delete-orphan")
    articles = db.relationship("Article", backref="company", lazy="dynamic", cascade="all, delete-orphan")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='user', index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    company_name = db.Column(db.String(255), nullable=False, index=True)
    contact_person = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(255), nullable=True, index=True)
    phone = db.Column(db.String(50), nullable=True)
    mobile = db.Column(db.String(50), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    postal_code = db.Column(db.String(20), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=False, default="Nederland")
    vat_number = db.Column(db.String(50), nullable=True)
    payment_terms = db.Column(db.Integer, nullable=False, default=30)
    credit_limit = db.Column(db.Numeric(10, 2), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_by_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = db.relationship("User")
    locations = db.relationship("Location", backref="customer", lazy="dynamic", cascade="all, delete-orphan")
    quotes = db.relationship("Quote", backref="customer", lazy="dynamic", cascade="all, delete-orphan")
    work_orders = db.relationship("WorkOrder", backref="customer", lazy="dynamic", cascade="all, delete-orphan")
    invoices = db.relationship("Invoice", backref="customer", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self, include_locations=False):
        """Serializes the Customer object to a dictionary."""
        customer_dict = {
            "id": self.id,
            "company_name": self.company_name,
            "contact_person": self.contact_person,
            "email": self.email,
            "phone": self.phone,
            "mobile": self.mobile,
            "address": self.address,
            "postal_code": self.postal_code,
            "city": self.city,
            "country": self.country,
            "vat_number": self.vat_number,
            "payment_terms": self.payment_terms,
            "credit_limit": float(self.credit_limit) if self.credit_limit else None,
            "notes": self.notes,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "location_count": self.locations.count()
        }
        if include_locations:
            customer_dict['locations'] = [loc.to_dict() for loc in self.locations.filter_by(is_active=True).all()]
        return customer_dict


class Location(db.Model):
    __tablename__ = "locations"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_id = db.Column(GUID(), db.ForeignKey("customers.id", ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    postal_code = db.Column(db.String(20), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=False, default="Nederland")
    contact_person = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    access_instructions = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Serializes the Location object to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "postal_code": self.postal_code,
            "city": self.city,
            "country": self.country,
            "contact_person": self.contact_person,
            "phone": self.phone,
            "access_instructions": self.access_instructions,
            "notes": self.notes,
            "is_active": self.is_active,
        }


class ArticleCategory(db.Model):
    __tablename__ = "article_categories"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    articles = db.relationship("Article", backref="category", lazy="dynamic")

    def to_dict(self):
        """Serializes the ArticleCategory object to a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "article_count": self.articles.count()
        }


class Article(db.Model):
    __tablename__ = "articles"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    category_id = db.Column(GUID(), db.ForeignKey("article_categories.id", ondelete='SET NULL'), nullable=True, index=True)
    code = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(255), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    unit = db.Column(db.String(50), nullable=False, default="stuks")
    purchase_price = db.Column(db.Numeric(10, 2), nullable=True)
    selling_price = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False, default=21.00)
    stock_quantity = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    min_stock_level = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    supplier = db.Column(db.String(255), nullable=True)
    supplier_code = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_by_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = db.relationship("User")
    __table_args__ = (db.UniqueConstraint("company_id", "code", name="unique_company_article_code"),)

    def to_dict(self):
        """Serializes the Article object to a dictionary."""
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description,
            "unit": self.unit,
            "purchase_price": float(self.purchase_price) if self.purchase_price else None,
            "selling_price": float(self.selling_price),
            "vat_rate": float(self.vat_rate),
            "stock_quantity": float(self.stock_quantity),
            "min_stock_level": float(self.min_stock_level),
            "supplier": self.supplier,
            "supplier_code": self.supplier_code,
            "is_active": self.is_active,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "is_low_stock": self.stock_quantity <= self.min_stock_level,
            "created_at": self.created_at.isoformat()
        }


class Quote(db.Model):
    __tablename__ = "quotes"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    quote_number = db.Column(db.String(50), nullable=False, index=True)
    customer_id = db.Column(GUID(), db.ForeignKey("customers.id", ondelete='CASCADE'), nullable=False, index=True)
    location_id = db.Column(GUID(), db.ForeignKey("locations.id", ondelete='SET NULL'), nullable=True, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    quote_date = db.Column(db.Date, nullable=False, default=date.today)
    valid_until = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(50), nullable=False, default="draft", index=True)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    vat_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    terms_conditions = db.Column(db.Text, nullable=True)
    created_by_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = db.relationship("User")
    lines = db.relationship("QuoteLine", backref="quote", lazy="dynamic", cascade="all, delete-orphan")
    work_orders = db.relationship("WorkOrder", backref="quote", lazy="dynamic")
    __table_args__ = (db.UniqueConstraint("company_id", "quote_number", name="unique_company_quote_number"),)


class QuoteLine(db.Model):
    __tablename__ = "quote_lines"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    quote_id = db.Column(GUID(), db.ForeignKey("quotes.id", ondelete='CASCADE'), nullable=False, index=True)
    article_id = db.Column(GUID(), db.ForeignKey("articles.id", ondelete='SET NULL'), nullable=True, index=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)


class WorkOrder(db.Model):
    __tablename__ = "work_orders"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    work_order_number = db.Column(db.String(50), nullable=False, index=True)
    quote_id = db.Column(GUID(), db.ForeignKey("quotes.id", ondelete='SET NULL'), nullable=True, index=True)
    customer_id = db.Column(GUID(), db.ForeignKey("customers.id", ondelete='CASCADE'), nullable=False, index=True)
    location_id = db.Column(GUID(), db.ForeignKey("locations.id", ondelete='SET NULL'), nullable=True, index=True)
    technician_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    work_date = db.Column(db.Date, nullable=True, default=date.today)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    status = db.Column(db.String(50), nullable=False, default="planned", index=True)
    work_performed = db.Column(db.Text, nullable=True)
    customer_signature_url = db.Column(db.String(255), nullable=True)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    vat_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    created_by_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = db.relationship("User", foreign_keys=[created_by_id])
    technician = db.relationship("User", foreign_keys=[technician_id])
    lines = db.relationship("WorkOrderLine", backref="work_order", lazy="dynamic", cascade="all, delete-orphan")
    time_entries = db.relationship("WorkOrderTimeEntry", backref="work_order", lazy="dynamic", cascade="all, delete-orphan")
    __table_args__ = (db.UniqueConstraint("company_id", "work_order_number", name="unique_company_work_order_number"),)


class WorkOrderLine(db.Model):
    __tablename__ = "work_order_lines"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    work_order_id = db.Column(GUID(), db.ForeignKey("work_orders.id", ondelete='CASCADE'), nullable=False, index=True)
    article_id = db.Column(GUID(), db.ForeignKey("articles.id", ondelete='SET NULL'), nullable=True, index=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)


class WorkOrderTimeEntry(db.Model):
    __tablename__ = "time_registrations"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='RESTRICT'), nullable=False, index=True)
    work_order_id = db.Column(GUID(), db.ForeignKey("work_orders.id", ondelete='CASCADE'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, default=date.today)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    hours = db.Column(db.Numeric(4, 2), nullable=False)
    hourly_rate = db.Column(db.Numeric(10, 2), nullable=True)
    description = db.Column(db.Text, nullable=False)
    is_billable = db.Column(db.Boolean, nullable=False, default=True)
    billable_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False, default=21.00)
    is_invoiced = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User")

class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    invoice_number = db.Column(db.String(50), nullable=False, index=True)
    customer_id = db.Column(GUID(), db.ForeignKey("customers.id", ondelete='CASCADE'), nullable=False, index=True)
    invoice_type = db.Column(db.String(50), nullable=False, default="standard")
    invoice_date = db.Column(db.Date, nullable=False, default=date.today)
    due_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(50), nullable=False, default="draft", index=True)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    vat_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    paid_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    payment_date = db.Column(db.Date, nullable=True)
    payment_reference = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = db.relationship("User")
    items = db.relationship("InvoiceItem", backref="invoice", lazy="dynamic", cascade="all, delete-orphan")
    __table_args__ = (db.UniqueConstraint("company_id", "invoice_number", name="unique_company_invoice_number"),)


class InvoiceItem(db.Model):
    __tablename__ = "invoice_lines"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    invoice_id = db.Column(GUID(), db.ForeignKey("invoices.id", ondelete='CASCADE'), nullable=False, index=True)
    work_order_id = db.Column(GUID(), db.ForeignKey("work_orders.id", ondelete='SET NULL'), nullable=True, index=True)
    article_id = db.Column(GUID(), db.ForeignKey("articles.id", ondelete='SET NULL'), nullable=True, index=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    vat_rate = db.Column(db.Numeric(5, 2), nullable=False)
    line_total = db.Column(db.Numeric(10, 2), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    article = db.relationship("Article", backref="invoice_items", lazy="dynamic")
    work_order = db.relationship("WorkOrder", backref="invoice_items", lazy="dynamic")


class Attachment(db.Model):
    __tablename__ = "attachments"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    entity_type = db.Column(db.String(50), nullable=False, index=True)
    entity_id = db.Column(GUID(), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=True)
    file_path = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    uploaded_by_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    uploaded_by = db.relationship("User")


class DocumentTemplate(db.Model):
    __tablename__ = "document_templates"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    document_type = db.Column(db.String(50), nullable=False, index=True)
    google_doc_id = db.Column(db.String(255), nullable=True)
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_by_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = db.relationship("User")


class AuditLog(db.Model):
    __tablename__ = "audit_log"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    company_id = db.Column(GUID(), db.ForeignKey("companies.id", ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(GUID(), db.ForeignKey("users.id", ondelete='SET NULL'), nullable=True, index=True)
    entity_type = db.Column(db.String(50), nullable=False, index=True)
    entity_id = db.Column(GUID(), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False, index=True)
    old_values = db.Column(db.JSON, nullable=True)
    new_values = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    user = db.relationship("User")