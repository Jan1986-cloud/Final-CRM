-- Final CRM Database Schema
-- PostgreSQL Database for Installation Companies CRM

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (bedrijfsinstellingen)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nederland',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    vat_number VARCHAR(50),
    chamber_of_commerce VARCHAR(50),
    logo_url TEXT,
    invoice_prefix VARCHAR(10) DEFAULT 'F',
    quote_prefix VARCHAR(10) DEFAULT 'O',
    workorder_prefix VARCHAR(10) DEFAULT 'W',
    default_vat_rate DECIMAL(5,2) DEFAULT 21.00,
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (multi-level toegang)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'sales', 'technician', 'financial')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table (klanten)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    address TEXT,
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nederland',
    vat_number VARCHAR(50),
    payment_terms INTEGER DEFAULT 30, -- days
    credit_limit DECIMAL(10,2),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Locations table (werklocaties)
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255), -- e.g., "Hoofdkantoor", "Vestiging Amsterdam"
    address TEXT NOT NULL,
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nederland',
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    access_instructions TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Article categories
CREATE TABLE article_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Articles table (artikelen)
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES article_categories(id),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) DEFAULT 'stuks', -- stuks, meter, uur, etc.
    purchase_price DECIMAL(10,2),
    selling_price DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 21.00,
    stock_quantity DECIMAL(10,2) DEFAULT 0,
    min_stock_level DECIMAL(10,2) DEFAULT 0,
    supplier VARCHAR(255),
    supplier_code VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- Quotes table (offertes)
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    quote_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    location_id UUID REFERENCES locations(id),
    title VARCHAR(255),
    description TEXT,
    quote_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    terms_conditions TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, quote_number)
);

-- Quote lines (offerte regels)
CREATE TABLE quote_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Work orders table (werkbonnen)
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    work_order_number VARCHAR(50) NOT NULL,
    quote_id UUID REFERENCES quotes(id), -- optional, if based on quote
    customer_id UUID REFERENCES customers(id) NOT NULL,
    location_id UUID REFERENCES locations(id),
    title VARCHAR(255),
    description TEXT,
    work_date DATE DEFAULT CURRENT_DATE,
    start_time TIME,
    end_time TIME,
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'invoiced')),
    technician_id UUID REFERENCES users(id),
    work_performed TEXT,
    customer_signature_url TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, work_order_number)
);

-- Work order lines (werkbon regels)
CREATE TABLE work_order_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Time registrations (urenregistratie)
CREATE TABLE time_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) NOT NULL,
    work_order_id UUID REFERENCES work_orders(id), -- optional
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    hours DECIMAL(4,2) NOT NULL,
    hourly_rate DECIMAL(10,2),
    description TEXT,
    is_billable BOOLEAN DEFAULT true,
    is_invoiced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table (facturen)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    invoice_type VARCHAR(50) DEFAULT 'standard' CHECK (invoice_type IN ('standard', 'combined')),
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    payment_date DATE,
    payment_reference VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, invoice_number)
);

-- Invoice lines (factuur regels)
CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES work_orders(id), -- for combined invoices
    article_id UUID REFERENCES articles(id),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Document attachments (foto's, bestanden)
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'work_order', 'quote', 'invoice'
    entity_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document templates (Google Docs templates)
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'quote', 'work_order', 'invoice', 'combined_invoice'
    google_doc_id VARCHAR(255), -- Google Docs document ID
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for important changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_articles_company_id ON articles(company_id);
CREATE INDEX idx_articles_code ON articles(company_id, code);
CREATE INDEX idx_quotes_company_id ON quotes(company_id);
CREATE INDEX idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_work_orders_company_id ON work_orders(company_id);
CREATE INDEX idx_work_orders_customer_id ON work_orders(customer_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_time_registrations_user_id ON time_registrations(user_id);
CREATE INDEX idx_time_registrations_date ON time_registrations(date);

-- Functions for automatic numbering
CREATE OR REPLACE FUNCTION generate_quote_number(company_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    prefix VARCHAR(10);
    next_number INTEGER;
    year_suffix VARCHAR(4);
BEGIN
    SELECT quote_prefix INTO prefix FROM companies WHERE id = company_uuid;
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM LENGTH(prefix || year_suffix || '-') + 1) AS INTEGER)), 0) + 1
    INTO next_number
    FROM quotes 
    WHERE company_id = company_uuid 
    AND quote_number LIKE prefix || year_suffix || '-%';
    
    RETURN prefix || year_suffix || '-' || LPAD(next_number::VARCHAR, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Similar functions for work orders and invoices
CREATE OR REPLACE FUNCTION generate_work_order_number(company_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    prefix VARCHAR(10);
    next_number INTEGER;
    year_suffix VARCHAR(4);
BEGIN
    SELECT workorder_prefix INTO prefix FROM companies WHERE id = company_uuid;
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM LENGTH(prefix || year_suffix || '-') + 1) AS INTEGER)), 0) + 1
    INTO next_number
    FROM work_orders 
    WHERE company_id = company_uuid 
    AND work_order_number LIKE prefix || year_suffix || '-%';
    
    RETURN prefix || year_suffix || '-' || LPAD(next_number::VARCHAR, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_invoice_number(company_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    prefix VARCHAR(10);
    next_number INTEGER;
    year_suffix VARCHAR(4);
BEGIN
    SELECT invoice_prefix INTO prefix FROM companies WHERE id = company_uuid;
    year_suffix := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(prefix || year_suffix || '-') + 1) AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices 
    WHERE company_id = company_uuid 
    AND invoice_number LIKE prefix || year_suffix || '-%';
    
    RETURN prefix || year_suffix || '-' || LPAD(next_number::VARCHAR, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic totals calculation
CREATE OR REPLACE FUNCTION calculate_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE quotes SET
        subtotal = (SELECT COALESCE(SUM(line_total / (1 + vat_rate/100)), 0) FROM quote_lines WHERE quote_id = NEW.quote_id),
        vat_amount = (SELECT COALESCE(SUM(line_total - (line_total / (1 + vat_rate/100))), 0) FROM quote_lines WHERE quote_id = NEW.quote_id),
        total_amount = (SELECT COALESCE(SUM(line_total), 0) FROM quote_lines WHERE quote_id = NEW.quote_id)
    WHERE id = NEW.quote_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_quote_totals
    AFTER INSERT OR UPDATE OR DELETE ON quote_lines
    FOR EACH ROW EXECUTE FUNCTION calculate_quote_totals();

-- Similar triggers for work orders and invoices
CREATE OR REPLACE FUNCTION calculate_work_order_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE work_orders SET
        subtotal = (SELECT COALESCE(SUM(line_total / (1 + vat_rate/100)), 0) FROM work_order_lines WHERE work_order_id = NEW.work_order_id),
        vat_amount = (SELECT COALESCE(SUM(line_total - (line_total / (1 + vat_rate/100))), 0) FROM work_order_lines WHERE work_order_id = NEW.work_order_id),
        total_amount = (SELECT COALESCE(SUM(line_total), 0) FROM work_order_lines WHERE work_order_id = NEW.work_order_id)
    WHERE id = NEW.work_order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_work_order_totals
    AFTER INSERT OR UPDATE OR DELETE ON work_order_lines
    FOR EACH ROW EXECUTE FUNCTION calculate_work_order_totals();

CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices SET
        subtotal = (SELECT COALESCE(SUM(line_total / (1 + vat_rate/100)), 0) FROM invoice_lines WHERE invoice_id = NEW.invoice_id),
        vat_amount = (SELECT COALESCE(SUM(line_total - (line_total / (1 + vat_rate/100))), 0) FROM invoice_lines WHERE invoice_id = NEW.invoice_id),
        total_amount = (SELECT COALESCE(SUM(line_total), 0) FROM invoice_lines WHERE invoice_id = NEW.invoice_id)
    WHERE id = NEW.invoice_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_lines
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

