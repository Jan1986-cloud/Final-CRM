# API Consistency Report
Generated: 2025-07-11T15:32:55.955746
---
This report validates backend route implementations against the single source of truth: `api_contracts.yaml`.

## ❌ FAILURE: Found 27 consistency issues.

### Implementation Mismatch
- Route create_article in articles.py accesses fields {'supplier', 'category_id', 'vat_rate', 'supplier_code', 'purchase_price', 'min_stock_level', 'unit', 'stock_quantity', 'description'} but its contract expects no request body.
- Route create_category in articles.py accesses fields {'name', 'description'} but its contract expects no request body.
- Route adjust_stock in articles.py accesses fields {'article_id'} but its contract expects no request body.
- Route register in auth.py accesses fields {'company_vat_number', 'company_city', 'company_phone', 'company_postal_code', 'company_address', 'company_email'} but its contract expects no request body.
- Route change_password in auth.py accesses fields {'new_password', 'current_password'} but its contract expects no request body.
- Route create_company in companies.py accesses fields {'postal_code', 'vat_number', 'city', 'phone', 'address', 'bank_account', 'logo_url', 'country', 'chamber_of_commerce'} but its contract expects no request body.
- Route create_customer in customers.py accesses fields {'company_name', 'country', 'vat_number', 'contact_person', 'mobile', 'payment_terms', 'email', 'phone', 'city', 'notes', 'address', 'credit_limit', 'postal_code'} but its contract expects no request body.
- Route create_customer_location in customers.py accesses fields {'postal_code', 'contact_person', 'city', 'phone', 'notes', 'address', 'access_instructions', 'name', 'country'} but its contract expects no request body.
- Route generate_document in documents.py accesses fields {'entity_id', 'template_type'} but its contract expects no request body.
- Route create_invoice in invoices.py accesses fields {'work_order_ids', 'payment_terms', 'status', 'invoice_date', 'notes'} but its contract expects no request body.
- Route create_invoice_from_work_orders in invoices.py accesses fields {'work_order_ids', 'payment_terms'} but its contract expects no request body.
- Route create_quote in quotes.py accesses fields {'terms_conditions', 'quote_date', 'location_id', 'title', 'customer_id', 'notes', 'lines', 'description'} but its contract expects no request body.
- Route update_quote_status in quotes.py accesses fields {'status'} but its contract expects no request body.
- Route create_work_order in work_orders.py accesses fields {'work_date', 'location_id', 'title', 'quote_id', 'customer_id', 'status', 'technician_id', 'notes', 'lines', 'description'} but its contract expects no request body.
- Route add_time_entry in work_orders.py accesses fields {'is_billable', 'hourly_rate', 'vat_rate', 'date', 'end_time', 'start_time', 'user_id'} but its contract expects no request body.
- Route update_work_order_status in work_orders.py accesses fields {'status'} but its contract expects no request body.

### Unregistered Routes
- Route POST /login in auth.py is not defined in api_contracts.yaml
- Route GET /<int:company_id> in companies.py is not defined in api_contracts.yaml
- Route PUT /<int:company_id> in companies.py is not defined in api_contracts.yaml
- Route DELETE /<int:company_id> in companies.py is not defined in api_contracts.yaml
- Route GET /<int:company_id>/settings in companies.py is not defined in api_contracts.yaml
- Route GET /<int:invoice_id> in invoices.py is not defined in api_contracts.yaml
- Route PUT /<int:invoice_id> in invoices.py is not defined in api_contracts.yaml
- Route DELETE /<int:invoice_id> in invoices.py is not defined in api_contracts.yaml
- Route GET /users/<int:user_id> in user.py is not defined in api_contracts.yaml
- Route PUT /users/<int:user_id> in user.py is not defined in api_contracts.yaml
- Route DELETE /users/<int:user_id> in user.py is not defined in api_contracts.yaml