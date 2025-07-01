# Supabase Integration – inventory_management

## Connection Details

- **Supabase Project URL:** https://hfhkxalqmeolpckrjadk.supabase.co
- **Supabase Key:** (Redacted for security)
- **Project Name:** inventory_management

---

## SQL Schema: Inventory Management

> The following SQL creates the necessary tables, constraints, triggers, and views for user authentication, product management, inventory tracking/history, low-stock alerting, and searchable/filterable queries.  
> **Run these statements in the Supabase SQL editor or via psql.**

### 1. Users (Authentication)

- Managed by Supabase Auth (no user table creation needed).
- Authenticated users are available in `auth.users`.

If you need app-specific profiles/settings:
```sql
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    role text DEFAULT 'clerk', -- or 'admin'
    created_at timestamptz DEFAULT now()
);
```

---

### 2. Products Table

```sql
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL CHECK (price >= 0),
    stock integer NOT NULL CHECK (stock >= 0),
    category text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

**Indexes for search/filter:**
```sql
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
```

**Trigger for `updated_at` timestamp:**
```sql
CREATE OR REPLACE FUNCTION update_product_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_product_updated_at ON public.products;
CREATE TRIGGER tr_set_product_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE PROCEDURE update_product_modified_column();
```

---

### 3. Inventory Change/History Table

Maintains a record of stock changes: additions, removals, sales, adjustments, etc.

```sql
CREATE TABLE IF NOT EXISTS public.inventory_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    change_type text NOT NULL CHECK (change_type IN ('add', 'remove', 'sale', 'adjust', 'restock', 'return')),
    quantity integer NOT NULL CHECK (quantity <> 0),
    note text,
    created_at timestamptz DEFAULT now()
);
```

**Index for recent history queries:**
```sql
CREATE INDEX IF NOT EXISTS idx_inventory_history_product_id ON public.inventory_history (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_type_created ON public.inventory_history (change_type, created_at DESC);
```

---

### 4. Inventory Stock Trigger (Optional, for automatic stock adjustment)

*If you wish to keep `products.stock` up-to-date automatically when new history is inserted, use:*

```sql
CREATE OR REPLACE FUNCTION sync_product_stock_from_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products
        SET stock = stock + NEW.quantity,
            updated_at = now()
        WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.products
        SET stock = stock - OLD.quantity,
            updated_at = now()
        WHERE id = OLD.product_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_stock_on_history ON public.inventory_history;
CREATE TRIGGER tr_update_stock_on_history
AFTER INSERT OR DELETE ON public.inventory_history
FOR EACH ROW
EXECUTE PROCEDURE sync_product_stock_from_history();
```

*Disable or remove this trigger if your front-end manages product stock directly.*

---

### 5. Low-Stock Alerts

- **View for easy querying (products below threshold):**
```sql
CREATE OR REPLACE VIEW public.low_stock_products AS
SELECT *
FROM public.products
WHERE stock <= 5;
```

- **Trigger/Notification for low-stock (optional, needs Action/Supabase Edge Functions for real notifications):**
```sql
-- You can also poll the low_stock_products view for alerts via API/UI
-- If you want to log or record low-stock events:

CREATE TABLE IF NOT EXISTS public.low_stock_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    detected_at timestamptz DEFAULT now(),
    seen boolean DEFAULT false
);

CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock <= 5 THEN
        INSERT INTO public.low_stock_events(product_id) VALUES (NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_low_stock ON public.products;
CREATE TRIGGER tr_notify_low_stock
AFTER UPDATE OF stock ON public.products
FOR EACH ROW
WHEN (NEW.stock <= 5 AND OLD.stock > 5)
EXECUTE PROCEDURE notify_low_stock();

-- Add an index for quick querying
CREATE INDEX IF NOT EXISTS idx_low_stock_events_seen ON public.low_stock_events(seen, detected_at DESC);
```

---

### 6. Constraints and Integrity

- All foreign keys use `ON DELETE CASCADE` where data-dependency is strong.
- Price and stock quantities cannot be negative.
- Change-type in inventory history is strictly controlled.

---

### 7. Supabase/SQL Usage Notes

- **Run all SQL in the Supabase dashboard (SQL editor) under your project.**
- For advanced triggers (like emails/SMS/webhook on low stock) use Supabase Edge Functions or external integrations.
- All inventory calculations, low-stock alerts, and search/filtering can be done efficiently via the defined schema.

---

## Current Features Covered

- User authentication (Supabase Auth default)
- Product CRUD (products)
- Inventory dashboard and change history (inventory_history)
- Low-stock alerting (view + event table)
- Product search & category filter (indexed fields)

## Change Management

- Any schema changes made should be added here for version control.
- Always preview existing data before destructive changes (e.g., drop).
- Coordinate trigger/table changes with your client integrations (React, API, etc).

---

## Integration Status

- All required schema and triggers for the inventory management are now documented here.
- The provided React app (`src/supabaseClient.js`) assumes this database structure.
- No changes needed to Supabase Auth for basic email/password authentication.

---

*Keep this file updated as the source of truth for your inventory database setup.*
