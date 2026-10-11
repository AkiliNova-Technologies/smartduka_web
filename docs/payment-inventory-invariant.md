# Payment and inventory invariant

Inventory is reserved/decremented only in `OrderService.createOrder`, through
guarded `updateMany` mutations while the canonical order is created. Payment
reconciliation never writes product or variant inventory. Therefore duplicate
provider events, polling/callback races, and reconciliation retries cannot
decrement inventory a second time.
