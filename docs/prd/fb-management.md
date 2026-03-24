# PRD: Food & Beverage Management

**Module:** `fb_management`
**Phase:** Future
**Status:** Planned
**Last updated:** March 2026

---

## Problem

Food and beverage is a critical part of the golf club experience but often the most poorly managed operationally. Clubs run multiple food service points — the main restaurant/dining room, the bar, a halfway house (on-course refreshment hut), a terrace or patio, and sometimes a spike bar. Orders are taken by hand, communicated verbally to the kitchen, and reconciled manually. During busy competition days or society events, the kitchen is overwhelmed because there is no advance ordering system.

Members increasingly expect to be able to order food from their phone — either pre-ordering before their round or ordering from the course for collection at the turn. Staff scheduling around F&B demand is guesswork without data on peak times and popular items.

## Goal

Provide a modern food and beverage management system covering table booking, menu management, order taking, kitchen display, and integration with the club's EPOS system.

## Users

- **Primary:** F&B manager, bar staff, kitchen staff
- **Secondary:** Members (ordering via app), front desk (restaurant reservations), club manager (reporting)

## Core requirements

### Must have

- **Menu management:**
  - Create menus: breakfast, lunch, dinner, bar snacks, specials
  - Menu items: name, description, price, category, dietary tags (V, VE, GF, DF)
  - Seasonal menus with active date ranges
  - Daily specials (quick add/remove)
  - Item availability toggle (86'd / sold out)
  - Photos per item (optional)
- **Table management:**
  - Define table layout: table numbers, capacity, location (inside, terrace, etc.)
  - Table booking: date, time, covers, member name or guest
  - Walk-in tracking: mark tables as occupied
  - Table status: available, reserved, occupied, being cleared
  - Floor plan view (visual table layout)
- **Order management:**
  - Create order: assign to table, takeaway, or collection point
  - Add items from menu
  - Item modifications (e.g. "no onions", "well done")
  - Split bills
  - Order status: placed, preparing, ready, served, paid
  - Order timing: track time from order to kitchen to service
- **Kitchen display system (KDS):**
  - Screen-based order display for kitchen (replaces paper tickets)
  - Orders appear in chronological order
  - Colour coding by urgency (new, preparing, overdue)
  - Mark items as complete
  - Course management: starters before mains
  - Audible alert for new orders
- **Player app integration:**
  - Members can view the menu in the LX2 player app
  - Pre-order food for a specific time (e.g. "lunch ready at 1pm after my round")
  - Order from the course: select "halfway house collection" with estimated arrival
  - Charge to member account (settled monthly or per visit)
- **Payment integration:**
  - Cash, card, and member account payment
  - Tab management: open a tab, add items, close and pay
  - Integration with EPOS hardware (card terminals)
  - Tipping: optional tip line on card payments
  - Receipt generation (printed and email)

### Should have

- Allergen matrix: display allergens per menu item (UK Food Information Regulations compliance)
- Stock level integration: auto-mark items as unavailable when ingredients run out
- Prep list generation: based on bookings and historical demand, suggest prep quantities
- Waste tracking: record unsold food for waste management reporting
- Supplier ordering: generate purchase orders based on stock levels and upcoming demand
- Staff meal tracking: separate from revenue
- Happy hour/promotion scheduling: automated price changes during specific periods
- Revenue reporting: F&B revenue by period, item popularity, average spend per cover

### Won't have (this phase)

- Delivery service (Deliveroo, Just Eat integration)
- Recipe management and costing
- Full stock management (see `stock_management` PRD)
- Nutritional information calculation
- Multi-language menus

## Open questions

- [ ] Which EPOS systems are most common in UK golf clubs, and what are their integration capabilities?
- [ ] Should the KDS be a dedicated tablet app or a web page viewable on any screen?
- [ ] How do we handle member account spending limits (some clubs cap monthly F&B spend)?
- [ ] Do we need to support different VAT rates for eat-in vs takeaway?
- [ ] Should halfway house orders be routed to the main kitchen or a separate mini-kitchen?

## Links

- Component: `apps/club/src/app/(console)/fb/` (future)
- Related PRD: `docs/prd/stock-management.md`
- Related PRD: `docs/prd/function-rooms.md`
- Related PRD: `docs/prd/club-reporting.md`
