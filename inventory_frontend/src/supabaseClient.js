import { createClient } from "@supabase/supabase-js";

// Environment variables should be used in real production apps
// For this example, these values are injected at build time (but never push secret keys to public repos)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://hfhkxalqmeolpckrjadk.supabase.co";
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaGt4YWxxbWVvbHBja3JqYWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNTA2MTksImV4cCI6MjA2NjkyNjYxOX0.UR0iquF4mlxU5iGMVTBA-asDmt9WILtSWC_AQJ0ANlQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Authentication ---

// PUBLIC_INTERFACE
export async function signUp(email, password) {
  /** Sign up user with email and password */
  return supabase.auth.signUp({ email, password });
}

// PUBLIC_INTERFACE
export async function signIn(email, password) {
  /** Sign in user with email and password */
  return supabase.auth.signInWithPassword({ email, password });
}

// PUBLIC_INTERFACE
export async function signOut() {
  /** Sign out current user */
  return supabase.auth.signOut();
}

// PUBLIC_INTERFACE
export function getCurrentUser() {
  /** Get the current authenticated user */
  return supabase.auth.getUser();
}

// --- Product CRUD ---

const PRODUCT_TABLE = "products";

/*
  Assumed table products:
    - id: uuid (PK)
    - name: text
    - description: text
    - price: numeric
    - stock: integer
    - created_at: timestamp
    - updated_at: timestamp
    - category: text
*/

// PUBLIC_INTERFACE
export async function fetchProducts({ search = "", category = "" } = {}) {
  /**
   * Fetch products with optional search and filter by category.
   * Returns all products if no filter/search applied.
   */
  let query = supabase.from(PRODUCT_TABLE).select("*").order("name", { ascending: true });
  if (search) query = query.ilike("name", `%${search}%`);
  if (category) query = query.eq("category", category);
  return query;
}

// PUBLIC_INTERFACE
export async function fetchProductById(productId) {
  /** Fetch one product by id */
  return supabase.from(PRODUCT_TABLE).select("*").eq("id", productId).single();
}

// PUBLIC_INTERFACE
export async function addProduct(product) {
  /** Add new product, expects object {name, description, price, stock, category} */
  return supabase.from(PRODUCT_TABLE).insert([product]);
}

// PUBLIC_INTERFACE
export async function updateProduct(productId, updates) {
  /** Update product by id with updates (object) */
  return supabase.from(PRODUCT_TABLE).update(updates).eq("id", productId);
}

// PUBLIC_INTERFACE
export async function deleteProduct(productId) {
  /** Delete product by id */
  return supabase.from(PRODUCT_TABLE).delete().eq("id", productId);
}

// --- Inventory dashboard & alerts ---

// PUBLIC_INTERFACE
export async function getInventoryDashboard() {
  /**
   * Aggregate summary for dashboard: total products, total stock, low-stock count
   * Assumes 'stock' column on products table
   */
  const { data: totalProducts, error: err1 } =
    await supabase.from(PRODUCT_TABLE).select("id", { count: "exact", head: true });
  const { data: totalStock } =
    await supabase.from(PRODUCT_TABLE).select("stock");
  let stockSum = 0;
  if (Array.isArray(totalStock)) {
    stockSum = totalStock.reduce((sum, item) => sum + (item.stock || 0), 0);
  }
  // Get low stock count (stock <= 5)
  const { data: lowStockProducts, error: err2 } =
    await supabase.from(PRODUCT_TABLE).select("id").lte("stock", 5);

  return {
    totalProducts: totalProducts?.length ?? 0,
    totalStock: stockSum,
    lowStockCount: lowStockProducts?.length ?? 0,
    error: err1 || err2,
  };
}

// PUBLIC_INTERFACE
export async function getLowStockAlerts(threshold = 5) {
  /** Fetch list of products where stock ≤ threshold, for alerts */
  return supabase.from(PRODUCT_TABLE).select("*").lte("stock", threshold).order("stock", { ascending: true });
}

// --- Product Search/Filter (wrapper, can use fetchProducts too) ---

// PUBLIC_INTERFACE
export async function searchProducts(searchTerm) {
  /** Search products by name (case-insensitive, partial match) */
  if (!searchTerm) return fetchProducts();
  return supabase.from(PRODUCT_TABLE).select("*").ilike("name", `%${searchTerm}%`);
}

// PUBLIC_INTERFACE
export async function filterProductsByCategory(category) {
  /** Filter products by category */
  return supabase.from(PRODUCT_TABLE).select("*").eq("category", category);
}
