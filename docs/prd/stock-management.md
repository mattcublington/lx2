# PRD: Stock & Inventory Management

**Module:** `stock_management`
**Phase:** Future
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Golf clubs manage inventory across multiple departments — the pro shop (clubs, balls, clothing, accessories), the bar (spirits, wines, beers, soft drinks), and the kitchen (fresh produce, dry goods, frozen items). Each department typically manages stock independently: the pro uses a manual log or their own spreadsheet, the bar manager does a weekly stock count on paper, and the kitchen orders based on habit rather than data.

There is no consolidated view of stock levels, no automated reorder alerts, and no tracking of shrinkage or wastage. Clubs discover they're out of a popular item only when a member asks for it. Over-ordering ties up cash in dead stock. Under-ordering means lost revenue. The year-end stock valuation for accounts is a multi-day manual exercise.

## Goal

Provide a unified stock management system across all club departments with real-time stock levels, automated reorder alerts, supplier management, and stocktaking tools.

## Users

- **Primary:** Pro shop manager, bar manager, kitchen/catering manager
- **Secondary:** Club manager (reporting), purchasing/admin staff, accountant (valuation)

## Core requirements

### Must have

- **Product catalogue:**
  - Add products with: name, SKU/barcode, category, department (pro shop, bar, kitchen)
  - Cost price (buy) and sell price
  - Supplier details (primary supplier, lead time)
  - Minimum stock level (reorder point)
  - Reorder quantity (default order amount)
  - Unit of measure (each, case, kg, litre)
  - Product variants (size, colour for clothing)
  - Product photo (optional)
- **Stock levels:**
  - Real-time stock quantity per product
  - Stock adjusted on: sale (via EPOS), manual adjustment, stock count, delivery received, wastage, breakage
  - Stock level history (audit trail of all changes)
  - Multiple locations: pro shop display, pro shop stockroom, bar, cellar, kitchen, walk-in
- **Low stock alerts:**
  - When stock falls below minimum, alert relevant department manager
  - Alert via dashboard notification and optional email
  - Suggested reorder: product, quantity, supplier, estimated cost
- **Purchase orders:**
  - Create purchase order to supplier
  - Select products and quantities
  - Expected delivery date
  - PO reference number (auto-generated)
  - Send PO to supplier via email (PDF attachment)
  - PO status: draft, sent, partially received, fully received, cancelled
- **Goods received:**
  - Record delivery against a purchase order
  - Check received quantities against ordered
  - Flag discrepancies (short delivery, damaged items)
  - Update stock levels on receipt
  - Record invoice number and cost for reconciliation
- **Stocktaking:**
  - Create a stock count sheet per department/location
  - Staff enter counted quantities (mobile-friendly for counting in stockroom)
  - System calculates variance (counted vs expected)
  - Review and approve adjustments
  - Stock count history for audit
- **Supplier management:**
  - Supplier database: name, contact, email, phone, address, payment terms
  - Products per supplier
  - Order history per supplier
  - Supplier performance: delivery accuracy, lead time

### Should have

- Barcode scanning: use phone camera or handheld scanner for stock counts and goods receipt
- Pro shop specific: track sizes and colours, sale items, seasonal stock rotation
- Bar specific: drink-by-drink stock deduction (integration with EPOS pour tracking)
- Kitchen specific: recipe-based deduction (selling a dish reduces ingredient stock)
- Wastage reporting: track and categorise waste (out of date, damaged, over-production)
- Margin reporting: gross margin by product, category, department
- Valuation report: total stock value at cost for year-end accounts
- Automatic PO generation: when stock hits minimum, draft a PO for approval

### Won't have (this phase)

- Warehouse management (bin locations, pick lists)
- Manufacturing/assembly (custom club building)
- Drop shipping
- E-commerce / online pro shop
- RFID stock tracking

## Open questions

- [ ] Should stock management be a single module or separate sub-modules per department?
- [ ] Which EPOS systems do we need to integrate with for automatic stock deduction on sale?
- [ ] How do we handle products sold across departments (e.g. bottled water sold in pro shop and bar)?
- [ ] Do we need to support multi-currency for suppliers (importing goods from overseas)?
- [ ] How granular should kitchen stock be — individual ingredients or pre-portioned items?

## Links

- Component: `apps/club/src/app/(console)/stock/` (future)
- Related PRD: `docs/prd/fb-management.md`
- Related PRD: `docs/prd/club-reporting.md`
