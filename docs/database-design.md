# BizFlow ZW --- Database Design

## 1. Project Overview

BizFlow ZW is a business management platform designed initially for a
Coca-Cola wholesale distributor in Zimbabwe.

The system manages wholesale beverage sales, product variants,
full-crate inventory, returnable glass bottles and crates, supplier
purchases, customer accounts, payments, expenses, reporting, planning
and AI-assisted business intelligence.

**Core business characteristics** - The business wholesales
Coca-Cola-manufactured beverages. - Products have different flavours and
bottle sizes. - Sales are made in full crates, not individual bottles. -
Each product variant has independent stock and pricing. - Empty glass
bottles and crates are returnable packaging. - Customers normally
provide the required empty packaging when purchasing full crates. - The
wholesaler returns empty packaging to the supplier when purchasing
replacement stock. - Trusted customers may receive packaging
exceptions. - Packaging exceptions can be recorded as packaging owed or
handled through refundable deposits. - USD and ZiG balances remain
separate. - All capstone receipts are non-fiscal.

## 2. Technology and Conventions

-   Database: PostgreSQL through Supabase.
-   Primary keys: UUID.
-   Timestamps: `TIMESTAMPTZ`.
-   Monetary values: `NUMERIC`, never floating-point types.
-   Currency codes: `USD` and `ZWG`.
-   Business-owned records are scoped by `business_id`.
-   Supabase Row-Level Security (RLS) protects tenant data.

All financial and inventory operations must be validated on the server.
Sensitive transactions must execute atomically.

## 3. Business Accounts and Access

### `businesses`

Stores each registered business.

Important fields: `id`, `name`, `business_type`, `phone`, `address`,
`logo_url`, `default_currency`, `created_at`, `updated_at`.

### `profiles`

Stores application user profiles linked to Supabase Auth.

Important fields: `id`, `full_name`, `phone`, `created_at`,
`updated_at`.

### `business_members`

Connects users to businesses.

Important fields: `id`, `business_id`, `user_id`, `role`, `is_active`,
`created_at`.

Roles should support owner, administrator, manager and cashier
permissions.

Every business-owned record must be protected from access by users who
are not members of that business.

## 4. Manufacturers, Products and Variants

### `manufacturers`

Stores beverage manufacturers. Coca-Cola is the initial manufacturer.

Important fields: `id`, `business_id`, `name`, `created_at`.

### `products`

Represents a beverage family or product identity.

Important fields: `id`, `business_id`, `manufacturer_id`, `name`,
`brand`, `category_id`, `description`, `is_active`, `created_at`,
`updated_at`.

Examples include Coca-Cola, Fanta and Sprite.

### `product_variants`

Represents a specific flavour and bottle size.

Important fields: `id`, `business_id`, `product_id`, `variant_name`,
`flavour`, `bottle_size_ml`, `is_active`, `created_at`, `updated_at`.

Examples: - Coca-Cola, 300ml. - Coca-Cola, 1L. - Fanta Orange, 300ml. -
Sprite, 300ml.

Each variant has independent inventory and pricing. A sale of Coca-Cola
300ml must not change Coca-Cola 1L stock.

## 5. Returnable Packaging

Returnable packaging is a core part of this business and must be managed
separately from beverage inventory and financial transactions.

### `packaging_types`

Defines reusable packaging categories.

Important fields: `id`, `business_id`, `name`, `packaging_category`,
`is_returnable`, `is_active`, `created_at`.

Examples: glass bottle and beverage crate.

### `product_packaging`

Defines the packaging composition required for each product variant.

Important fields: `id`, `business_id`, `product_variant_id`,
`packaging_type_id`, `quantity_required`, `created_at`, `updated_at`.

The number of bottles per crate must be configurable. Do not assume
every variant uses the same crate composition.

### `packaging_transactions`

Records all returnable packaging movements.

Important fields: `id`, `business_id`, `packaging_type_id`, `quantity`,
`transaction_type`, `source_type`, `source_id`, `customer_id`,
`supplier_id`, `created_by`, `notes`, `created_at`.

Supported movement types: - `received_from_customer` -
`issued_to_customer` - `returned_to_supplier` -
`received_from_supplier` - `damaged` - `lost` - `stock_adjustment`

Packaging quantities must be traceable to their originating transaction.

### `customer_packaging_accounts`

Tracks packaging balances by customer and packaging type.

Important fields: `id`, `business_id`, `customer_id`,
`packaging_type_id`, `balance_quantity`, `updated_at`.

The balance represents packaging owed by the customer to the business
and must be reconcilable against transaction history.

### `supplier_packaging_accounts`

Tracks packaging balances with suppliers.

Important fields: `id`, `business_id`, `supplier_id`,
`packaging_type_id`, `balance_quantity`, `updated_at`.

### `packaging_exceptions`

Records authorised departures from the standard packaging policy.

Important fields: `id`, `business_id`, `sale_id`, `customer_id`,
`approved_by`, `exception_reason`, `handling_method`, `status`,
`created_at`.

Handling methods: - `packaging_owed` - `refundable_deposit`

Every exception must have an approving user and a reason. The system
must not silently approve packaging shortages.

### `packaging_deposits`

Records refundable deposits collected for packaging not returned.

Important fields: `id`, `business_id`, `customer_id`, `sale_id`,
`currency`, `amount`, `amount_refunded`, `status`, `created_at`,
`updated_at`.

Deposits are liabilities, not ordinary sales revenue.

### `deposit_refunds`

Records refunds against packaging deposits.

Important fields: `id`, `business_id`, `packaging_deposit_id`, `amount`,
`currency`, `payment_method`, `reference`, `refunded_by`, `created_at`.

Refunds must not exceed the refundable deposit balance.

## 6. Product Inventory and Pricing

### `inventory_movements`

Records every full-crate stock movement.

Important fields: `id`, `business_id`, `product_variant_id`,
`movement_type`, `quantity_crates`, `source_type`, `source_id`,
`created_by`, `notes`, `created_at`.

Movement types: - `opening_stock` - `purchase_received` - `sale` -
`customer_return` - `damaged` - `lost` - `stock_adjustment`

Stock must be derived from the movement ledger or a safely maintained
database projection. Negative stock must be prevented.

### `product_prices`

Stores selling prices for each product variant and currency.

Important fields: `id`, `business_id`, `product_variant_id`, `currency`,
`selling_price_per_crate`, `effective_from`, `is_active`, `created_at`,
`updated_at`.

The same variant can have separate USD and ZWG selling prices. No
automatic currency conversion should occur. Historical sale prices must
be preserved in sale-item records.

## 7. Customers and Suppliers

### `customers`

Stores customer information.

Important fields: `id`, `business_id`, `full_name`, `business_name`,
`phone`, `address`, `credit_limit`, `is_active`, `created_at`,
`updated_at`.

Customer credit balances must be calculated separately for each
currency. Packaging balances must remain separate from financial credit
balances.

### `suppliers`

Stores the business's suppliers.

Important fields: `id`, `business_id`, `name`, `contact_person`,
`phone`, `address`, `is_active`, `created_at`, `updated_at`.

Supplier management should remain lightweight. Purchase orders, complex
supplier accounting and partial supplier-payment workflows are outside
the capstone scope.

## 8. Wholesale Sales

### `sales`

Stores completed and pending sales.

Important fields: `id`, `business_id`, `customer_id`, `sale_number`,
`currency`, `subtotal`, `discount_amount`, `total_amount`, `status`,
`created_by`, `created_at`, `updated_at`.

Statuses should support `draft`, `completed` and `voided`.

### `sale_items`

Stores individual beverage variants sold in a transaction.

Important fields: `id`, `business_id`, `sale_id`, `product_variant_id`,
`product_name_snapshot`, `variant_name_snapshot`, `quantity_crates`,
`unit_price`, `discount_amount`, `line_total`, `created_at`.

Each item preserves the product description, quantity and price as they
existed when the sale occurred.

### Sales transaction rules

A completed sale must: 1. Validate the user's permission. 2. Validate
the product variant and available crate stock. 3. Calculate required
bottles and crates from configured packaging composition. 4. Check
packaging returned by the customer. 5. Block completion when the normal
packaging requirement is not met. 6. Allow an authorised packaging
exception with a recorded reason and handling method. 7. Record the sale
and its item lines. 8. Record the beverage stock movement. 9. Record
packaging movements and customer packaging balances. 10. Record payments
and allocations where applicable. 11. Commit all related operations
atomically.

A failed transaction must not leave partial stock, packaging or
financial updates.

## 9. Supplier Stock Purchases

### `stock_purchases`

Records direct purchases from suppliers.

Important fields: `id`, `business_id`, `supplier_id`, `purchase_number`,
`currency`, `total_amount`, `status`, `created_by`, `created_at`,
`updated_at`.

### `stock_purchase_items`

Records beverage variants received.

Important fields: `id`, `business_id`, `stock_purchase_id`,
`product_variant_id`, `quantity_crates`, `cost_per_crate`, `line_total`,
`created_at`.

### Supplier purchase rules

When the wholesaler purchases replacement stock: 1. Record the supplier
and beverage variants. 2. Record full crates received. 3. Record money
paid and currency. 4. Record empty bottles and crates returned to the
supplier. 5. Update supplier packaging balances. 6. Record stock
movements for crates received. 7. Preserve complete purchase history.

Supplier exchange requirements must be configurable and recorded per
transaction.

## 10. Payments and Customer Credit

### `payments`

Records money received or paid.

Important fields: `id`, `business_id`, `customer_id`, `supplier_id`,
`amount`, `currency`, `payment_type`, `payment_method`, `reference`,
`status`, `created_by`, `created_at`.

Payment methods should support configurable cash, mobile money, bank
transfer and other relevant methods.

### `payment_allocations`

Connects payments to sales or other supported financial obligations.

Important fields: `id`, `business_id`, `payment_id`, `sale_id`,
`allocated_amount`, `created_at`.

Allocated amounts must not exceed the available payment amount or the
outstanding amount of the relevant sale.

### `credit_accounts`

Stores customer credit settings.

Important fields: `id`, `business_id`, `customer_id`, `currency`,
`credit_limit`, `is_active`, `created_at`, `updated_at`.

Outstanding credit is derived from completed credit sales and allocated
payments. Partial payments are supported. USD and ZWG balances must
never be combined. Packaging owed is never included in monetary credit
calculations.

## 11. Returns and Financial Adjustments

### `sales_returns`

Records approved returns against original sales.

Important fields: `id`, `business_id`, `sale_id`, `return_number`,
`reason`, `status`, `created_by`, `created_at`.

### `sales_return_items`

Records returned beverage quantities.

Important fields: `id`, `business_id`, `sales_return_id`,
`sale_item_id`, `quantity_crates`, `condition`, `created_at`.

Returns must record whether returned beverages are restocked, damaged or
otherwise classified. Packaging returned by a customer is recorded
separately through packaging transactions.

### `financial_adjustments`

Records authorised corrections and reversals.

Important fields: `id`, `business_id`, `reference_type`, `reference_id`,
`adjustment_type`, `amount`, `currency`, `reason`, `approved_by`,
`created_at`.

Financial history must not be silently overwritten or deleted.

## 12. Expenses

### `expenses`

Records business expenses.

Important fields: `id`, `business_id`, `category`, `description`,
`amount`, `currency`, `payment_method`, `reference`, `expense_date`,
`created_by`, `created_at`.

Expenses preserve their original currency.

## 13. Receipts

### `receipts`

Stores receipt records generated from sales.

Important fields: `id`, `business_id`, `sale_id`, `receipt_number`,
`receipt_type`, `generated_at`, `generated_by`.

All capstone receipts must be explicitly marked `NON_FISCAL`.

Receipts should support business logo and details, sale and receipt
numbers, product variants and crate quantities, prices and currency,
payments and outstanding balances, packaging returned or outstanding,
printing and sharing.

Bluetooth printer compatibility must be tested with actual hardware
before being treated as guaranteed. ZIMRA FDMS fiscalisation is future
work.

## 14. Calendar and Reminders

### `calendar_events`

Stores business activities and planning events.

Important fields: `id`, `business_id`, `title`, `description`,
`event_type`, `start_at`, `end_at`, `assigned_to`,
`related_record_type`, `related_record_id`, `created_by`, `created_at`.

### `reminders`

Stores reminder schedules and delivery status.

Important fields: `id`, `business_id`, `calendar_event_id`, `remind_at`,
`status`, `created_at`.

Supports appointments, follow-ups, business tasks, due dates and planned
restocking.

## 15. AI Conversations

### `conversations`

Stores AI assistant conversation sessions.

Important fields: `id`, `business_id`, `user_id`, `title`, `created_at`,
`updated_at`.

### `messages`

Stores messages within a conversation.

Important fields: `id`, `business_id`, `conversation_id`, `role`,
`content`, `created_at`.

The AI assistant must use authorised business data and must not invent
stock, sales, credit or packaging balances. AI-generated suggestions
must not directly mutate financial or inventory records without explicit
user confirmation and normal backend validation. AI functionality
requires an internet connection.

## 16. Audit Logs

### `audit_logs`

Records sensitive business actions.

Important fields: `id`, `business_id`, `user_id`, `action`,
`entity_type`, `entity_id`, `before_data`, `after_data`, `reason`,
`created_at`.

Important events include sales voids, stock and packaging adjustments,
packaging exceptions, deposit collection and refunds, financial
adjustments, product price changes and user permission changes.

Audit records must be protected from unauthorised modification.

## 17. Calculator

The calculator is a frontend utility and does not require a database
table.

It should support basic arithmetic, percentages, discounts, quantity
multiplied by unit price and quick wholesale calculations. It must not
automatically create sales, expenses or financial records.

## 18. Reporting Requirements

### Sales

-   Daily, weekly and monthly sales.
-   Sales by product and variant.
-   Crates sold.
-   Revenue by currency.
-   Best-selling variants.

### Inventory

-   Available crates per variant.
-   Stock movement history.
-   Low-stock alerts.
-   Damaged and lost stock.
-   Inventory valuation using appropriately defined cost data.

### Packaging

-   Available empty bottles and crates.
-   Packaging owed by customers.
-   Packaging balances with suppliers.
-   Packaging deposits outstanding.
-   Packaging returned, damaged or lost.
-   Packaging reconciliation discrepancies.

### Finance

-   Money received.
-   Outstanding customer credit.
-   Partial payments.
-   Expenses.
-   Cash flow.
-   Gross profit estimates.

Revenue, cash received, customer credit and profit are distinct
financial concepts. USD and ZWG reports remain separate unless the user
explicitly requests a conversion using a recorded exchange rate.

## 19. Security and Data Integrity

-   Enforce RLS on business-owned tables.
-   Validate business membership and permissions on the backend.
-   Never expose Supabase service-role credentials or AI API keys in
    frontend code.
-   Validate all quantities and monetary values.
-   Prevent negative beverage inventory.
-   Protect packaging and financial records from unauthorised updates.
-   Use database transactions for completed sales and purchases.
-   Preserve historical transaction snapshots.
-   Use audit logs for sensitive operations.
-   Ensure users cannot access another business's records.

## 20. Excluded and Deferred Features

The initial capstone will not implement: - Barcode scanning and barcode
label generation. - Purchase orders. - Goods received against purchase
orders. - Partial supplier-payment workflows. - Purchase returns. -
Complex supplier accounting. - ZIMRA FDMS fiscalisation. - Full offline
synchronisation. - Multi-branch enterprise management.

Offline synchronisation remains a stretch goal. AI functionality
requires an internet connection.

## 21. Decisions to Validate Before SQL Migration

The following details must be confirmed with the pilot wholesaler before
hardcoding business-specific rules:

1.  Exact bottle quantity per crate for each product variant.
2.  Whether all beverage variants use the same type of returnable crate.
3.  Whether bottles and crates are tracked independently in every
    transaction.
4.  Supplier packaging exchange requirements.
5.  How packaging deposits are valued and refunded.
6.  Whether customer packaging exceptions can be approved by managers or
    only the owner.
7.  Whether packaging owed can be settled across multiple future
    transactions.
8.  How damaged and missing packaging is valued.
9.  Whether stock can ever be sold below zero with special
    authorisation.
10. Actual printer compatibility and receipt layout.

These decisions should be validated through observation and task-based
testing with the pilot wholesaler.

## 22. Implementation Principle

BizFlow ZW must be designed around the real wholesale workflow.

The database must provide accurate, traceable records of beverage stock,
returnable bottles and crates, customer packaging balances, supplier
packaging balances, sales and payments, customer credit, refundable
deposits and business expenses.

The system must prioritise transaction integrity, simple workflows,
reliable reporting and practical usability for the wholesaler.
