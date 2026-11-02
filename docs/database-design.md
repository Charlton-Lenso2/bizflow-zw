# BizFlow ZW — Database Design

## 1. Purpose and Scope

BizFlow ZW is a mobile-first business management application for small businesses in Zimbabwe, beginning with a real wholesale business pilot.

The database must support reliable sales, inventory, customer credit, financial records, business planning, reporting, and AI-assisted insights.

The design should be comprehensive enough to support the pilot business while avoiding unnecessary enterprise procurement complexity.

## 2. Technology and Data Principles

- Database: PostgreSQL through Supabase
- Primary keys: UUID
- Monetary values: NUMERIC, never FLOAT or REAL
- Timestamps: TIMESTAMPTZ
- Currency codes: USD and ZWG
- All business-owned records must be scoped to a business
- Financial and inventory operations must be traceable
- Core business calculations must be deterministic and performed by the backend/database
- AI must not be the source of truth for financial or inventory values

## 3. Business and User Accounts

### businesses

- id: UUID, primary key
- name: TEXT, required
- business_type: TEXT
- phone: TEXT
- email: TEXT
- address: TEXT
- logo_url: TEXT
- theme_config: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

### profiles

- id: UUID, primary key, references auth.users
- full_name: TEXT
- phone: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

### business_members

- id: UUID, primary key
- business_id: UUID, references businesses
- user_id: UUID, references profiles
- role: TEXT (owner, manager, staff)
- created_at: TIMESTAMPTZ

Constraints:
- A user must not have duplicate membership in the same business.
- Roles must be validated.
- Access must be restricted to authorised business members.

## 4. Customers

### customers

- id: UUID, primary key
- business_id: UUID, references businesses
- name: TEXT, required
- phone: TEXT
- email: TEXT
- address: TEXT
- notes: TEXT
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Customers may have separate credit balances in USD and ZWG.

## 5. Products and Inventory

### product_categories

- id: UUID, primary key
- business_id: UUID, references businesses
- name: TEXT, required
- created_at: TIMESTAMPTZ

### products

- id: UUID, primary key
- business_id: UUID, references businesses
- category_id: UUID, references product_categories, nullable
- name: TEXT, required
- sku: TEXT, nullable
- description: TEXT
- unit: TEXT, required
- selling_price: NUMERIC(14,2)
- currency: TEXT (USD or ZWG)
- cost_price: NUMERIC(14,2)
- cost_currency: TEXT (USD or ZWG)
- reorder_level: NUMERIC(14,3)
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Constraints:
- Product SKU should be unique within a business when supplied.
- Product prices and reorder levels must be non-negative.
- Barcode functionality is excluded from the capstone scope.

### inventory_movements

- id: UUID, primary key
- business_id: UUID, references businesses
- product_id: UUID, references products
- movement_type: TEXT
- quantity_change: NUMERIC(14,3)
- unit_cost: NUMERIC(14,2), nullable
- cost_currency: TEXT (USD or ZWG), nullable
- reference_type: TEXT, nullable
- reference_id: UUID, nullable
- notes: TEXT
- created_by: UUID, references profiles
- created_at: TIMESTAMPTZ

Movement types may include:
- opening_stock
- purchase_received
- sale
- customer_return
- damaged
- lost
- stock_adjustment

Inventory quantity is derived from the sum of stock movements. Any cached quantity must be kept consistent with the movement ledger through transactional backend operations.

All stock changes must be traceable.

## 6. Lightweight Suppliers and Direct Stock Purchases

Supplier management is intentionally limited. The application is not intended to implement enterprise procurement workflows.

### suppliers

- id: UUID, primary key
- business_id: UUID, references businesses
- name: TEXT, required
- contact_person: TEXT
- phone: TEXT
- email: TEXT
- notes: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

### stock_purchases

- id: UUID, primary key
- business_id: UUID, references businesses
- supplier_id: UUID, references suppliers, nullable
- purchase_reference: TEXT, nullable
- purchase_date: TIMESTAMPTZ
- currency: TEXT (USD or ZWG)
- total_cost: NUMERIC(14,2)
- notes: TEXT
- recorded_by: UUID, references profiles
- created_at: TIMESTAMPTZ

### stock_purchase_items

- id: UUID, primary key
- purchase_id: UUID, references stock_purchases
- product_id: UUID, references products
- quantity: NUMERIC(14,3)
- unit_cost: NUMERIC(14,2)
- line_total: NUMERIC(14,2)

A direct stock purchase records goods received and creates corresponding inventory movements.

Excluded from scope:
- Purchase orders
- Receiving goods against purchase orders
- Partial supplier payments
- Purchase returns
- Complex supplier accounts
- Enterprise procurement workflows

## 7. Sales

### sales

- id: UUID, primary key
- business_id: UUID, references businesses
- customer_id: UUID, references customers, nullable
- sale_number: TEXT
- currency: TEXT (USD or ZWG)
- subtotal: NUMERIC(14,2)
- discount_amount: NUMERIC(14,2)
- total_amount: NUMERIC(14,2)
- sale_status: TEXT (completed, voided)
- created_by: UUID, references profiles
- created_at: TIMESTAMPTZ
- voided_at: TIMESTAMPTZ, nullable
- voided_by: UUID, references profiles, nullable
- void_reason: TEXT, nullable

### sale_items

- id: UUID, primary key
- sale_id: UUID, references sales
- product_id: UUID, references products
- product_name_snapshot: TEXT
- quantity: NUMERIC(14,3)
- unit_price: NUMERIC(14,2)
- line_discount: NUMERIC(14,2)
- line_total: NUMERIC(14,2)
- cost_price_snapshot: NUMERIC(14,2), nullable
- cost_currency_snapshot: TEXT, nullable

Product names, prices, and relevant cost values are snapshotted so historical sales remain accurate when product details change.

A completed sale must:
- Validate stock availability according to the agreed stock policy.
- Record sale items.
- Create inventory movements.
- Record any payment received.
- Create or update the customer's credit balance when applicable.
- Execute atomically in a database transaction.

## 8. Customer Payments and Credit Ledger

### payments

- id: UUID, primary key
- business_id: UUID, references businesses
- customer_id: UUID, references customers
- currency: TEXT (USD or ZWG)
- amount: NUMERIC(14,2)
- payment_method: TEXT
- reference: TEXT, nullable
- received_by: UUID, references profiles
- received_at: TIMESTAMPTZ
- notes: TEXT

### payment_allocations

- id: UUID, primary key
- payment_id: UUID, references payments
- sale_id: UUID, references sales
- amount: NUMERIC(14,2)

A payment may be allocated to one or more outstanding sales.

Rules:
- Allocations must not exceed the payment amount.
- Allocations must not exceed the sale's outstanding balance.
- Payment currency must match the sale currency.
- Payment customer and sale customer must match.
- Allocation operations must be transactional.
- Partial payments must be supported.

### credit_accounts

- id: UUID, primary key
- business_id: UUID, references businesses
- customer_id: UUID, references customers
- currency: TEXT (USD or ZWG)
- credit_limit: NUMERIC(14,2), nullable
- created_at: TIMESTAMPTZ

A customer may have separate credit accounts for USD and ZWG.

Outstanding balances are derived from completed sales, payment allocations, and approved adjustments. They must not be manually overwritten.

## 9. Sales Returns and Financial Adjustments

### sales_returns

- id: UUID, primary key
- business_id: UUID, references businesses
- sale_id: UUID, references sales
- customer_id: UUID, references customers, nullable
- return_number: TEXT
- currency: TEXT (USD or ZWG)
- total_amount: NUMERIC(14,2)
- reason: TEXT
- return_status: TEXT (completed, voided)
- processed_by: UUID, references profiles
- created_at: TIMESTAMPTZ

### sales_return_items

- id: UUID, primary key
- return_id: UUID, references sales_returns
- sale_item_id: UUID, references sale_items
- product_id: UUID, references products
- quantity: NUMERIC(14,3)
- unit_price: NUMERIC(14,2)
- line_total: NUMERIC(14,2)
- restock: BOOLEAN

Completed returns must create inventory movements when returned goods are restocked and must update the relevant financial records through a controlled backend workflow.

### financial_adjustments

- id: UUID, primary key
- business_id: UUID, references businesses
- customer_id: UUID, references customers, nullable
- sale_id: UUID, references sales, nullable
- currency: TEXT (USD or ZWG)
- amount: NUMERIC(14,2)
- adjustment_type: TEXT
- reason: TEXT
- created_by: UUID, references profiles
- created_at: TIMESTAMPTZ

Financial adjustments must be traceable and must not silently overwrite original sales or payments.

## 10. Expenses

### expenses

- id: UUID, primary key
- business_id: UUID, references businesses
- category: TEXT
- description: TEXT, required
- amount: NUMERIC(14,2)
- currency: TEXT (USD or ZWG)
- payment_method: TEXT
- expense_date: TIMESTAMPTZ
- recorded_by: UUID, references profiles
- created_at: TIMESTAMPTZ

Expenses support business reporting and cash-flow summaries.

## 11. Receipts

### receipts

- id: UUID, primary key
- business_id: UUID, references businesses
- sale_id: UUID, references sales
- receipt_number: TEXT
- receipt_type: TEXT, fixed to NON_FISCAL
- issued_at: TIMESTAMPTZ
- generated_by: UUID, references profiles

All capstone receipts must visibly display NON-FISCAL RECEIPT.

ZIMRA FDMS fiscalisation is future work and is not part of the capstone implementation.

## 12. Planning Calendar and Reminders

### calendar_events

- id: UUID, primary key
- business_id: UUID, references businesses
- title: TEXT, required
- description: TEXT, nullable
- event_type: TEXT
- start_at: TIMESTAMPTZ
- end_at: TIMESTAMPTZ, nullable
- all_day: BOOLEAN
- related_customer_id: UUID, references customers, nullable
- related_product_id: UUID, references products, nullable
- related_sale_id: UUID, references sales, nullable
- related_purchase_id: UUID, references stock_purchases, nullable
- created_by: UUID, references profiles
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

### reminders

- id: UUID, primary key
- business_id: UUID, references businesses
- event_id: UUID, references calendar_events, nullable
- title: TEXT, required
- reminder_at: TIMESTAMPTZ
- status: TEXT (pending, completed, dismissed)
- created_by: UUID, references profiles
- created_at: TIMESTAMPTZ

Calendar use cases:
- Business tasks and planning
- Customer payment due dates and follow-ups
- Appointments and important dates
- Planned stock purchases or restocking

Relevant reminders should link to their associated business records.

## 13. AI Conversations

### conversations

- id: UUID, primary key
- business_id: UUID, references businesses
- user_id: UUID, references profiles
- title: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

### messages

- id: UUID, primary key
- conversation_id: UUID, references conversations
- role: TEXT (user, assistant)
- content: TEXT
- created_at: TIMESTAMPTZ

AI tool execution and sensitive operations must be controlled and audited by the backend.

The AI assistant may retrieve authorised business information and explain results, but it must not invent missing data or independently modify financial or inventory records.

## 14. Audit Trail

### audit_logs

- id: UUID, primary key
- business_id: UUID, references businesses
- user_id: UUID, references profiles
- action: TEXT
- entity_type: TEXT
- entity_id: UUID
- metadata: JSONB
- created_at: TIMESTAMPTZ

Sensitive actions such as voiding sales, financial adjustments, stock adjustments, and permission changes should be traceable.

## 15. Calculator

The built-in calculator is a client-side utility and does not require database tables.

It should support:
- Basic arithmetic
- Percentage and discount calculations
- Quantity multiplied by price
- Quick calculations during business workflows
- Offline use

Calculator results must not automatically become financial records. The user must explicitly apply a result to a transaction.

## 16. Reporting Requirements

Reports should derive from authoritative business records and support separate USD and ZWG views.

Planned reports include:
- Sales totals by date and currency
- Payments received
- Outstanding customer credit
- Overdue accounts and credit ageing
- Inventory quantities and movements
- Inventory valuation where cost data is available
- Fast- and slow-moving products
- Expenses
- Gross profit estimates based on recorded cost data
- Supplier and stock purchase history

Reports must clearly distinguish revenue, payments received, outstanding credit, expenses, and estimated profit.

## 17. Security and Data Integrity

1. Every business-owned record must include business_id directly or be reachable through a business-owned parent.
2. Enforce foreign keys and valid status/currency constraints.
3. Prevent cross-business references between customers, products, sales, payments, purchases, and inventory.
4. Use Row Level Security on exposed tables.
5. Keep Supabase service-role credentials and AI provider keys server-side.
6. Use database transactions for sales, payments, returns, and stock operations.
7. Prevent payment allocations from exceeding payment amounts or outstanding sale balances.
8. Preserve financial and inventory history.
9. Validate all monetary and quantity inputs on the backend.
10. Use NUMERIC types and explicit rounding rules for financial calculations.
11. Ensure AI tools only access data authorised for the current user and business.

## 18. Excluded and Deferred Features

### Excluded from the capstone
- Barcode scanning and barcode label generation
- Purchase orders
- Receiving goods against purchase orders
- Partial supplier payments
- Purchase returns
- Complex enterprise supplier accounting

### Stretch goal
- Offline access and synchronisation

### Future work
- ZIMRA FDMS fiscalisation

## 19. Decisions to Validate Before SQL Implementation

- Whether stock may go negative during a sale.
- Whether products can have different selling prices in USD and ZWG.
- How the pilot handles bulk units, cartons, and individual units.
- Whether sale voids require manager approval.
- How returned goods are classified as restockable or damaged.
- Whether calendar reminders need push notifications or in-app reminders only.
- Whether multiple users will operate the business during the pilot.
