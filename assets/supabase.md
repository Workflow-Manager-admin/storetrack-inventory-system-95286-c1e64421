# Supabase Integration – inventory_management

## Connection Details

- **Supabase Project URL:** https://hfhkxalqmeolpckrjadk.supabase.co
- **Supabase Key:** (Redacted for security)
- **Project Name:** inventory_management

---

## Required Tables & SQL for Inventory Features

> Use the Supabase dashboard SQL editor or psql to run these statements.

### 1. Users (Managed by Supabase Auth)

- No custom user table needed for email/password authentication. Supabase Auth handles user registration and login.

### 2. Products Table

```sql
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    stock integer NOT NULL CHECK (stock >= 0),
    category text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

- Add index for faster search/filter:
```sql
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
```

### 3. Update trigger for updated_at

```sql
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.products;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();
```

### 4. Low-Stock Alerts View (for easy pull/API)

For alerting in-app (products <= a threshold):

```sql
CREATE OR REPLACE VIEW low_stock_products AS
SELECT * FROM public.products WHERE stock <= 5;
```
- Or just perform direct queries as done in the React client.

---

## Features Supported by Client

- User authentication (Supabase Auth built-in)
- Product CRUD: addProduct, fetchProductById, fetchProducts, updateProduct, deleteProduct
- Inventory dashboard (aggregate totals, low-stock count)
- Low-stock product alerts (getLowStockAlerts)
- Product search and category filtering (searchProducts, filterProductsByCategory)

## Integration Status

- Supabase client and wrappers for all major inventory features have been implemented in React (`src/supabaseClient.js`).
- Direct SQL execution/admin access via client is restricted (see error below), so all database setup/changes should be managed in dashboard or documented SQL above.

  ```
  Could not find the function public.run_sql(query) in the schema cache
  ```

---

## Recommendations

- Run the provided SQL in the Supabase dashboard or via psql to create the necessary schema.
- For table structure changes or advanced triggers, maintain updates in this file for reproducibility.

## Next Steps

- Use provided wrappers/hooks (`src/supabaseClient.js`) for all backend data operations in React.
- If new features require new tables/relations, document their SQL here.

---

*This documentation will be updated once metadata/schema access becomes available or additional configuration changes are made to Supabase.*
