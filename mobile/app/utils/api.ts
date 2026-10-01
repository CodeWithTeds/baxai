export interface ApiProduct {
  id: number | string;
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  short_description?: string;
  badge?: string;
  status?: string;
  base_price?: string | number;
  compare_at_price?: string | number;
  thumbnail?: string | null;
  fallback_image?: string | null;
  has_3d_preview?: boolean;
  is_customizable?: boolean;
  viewer_type?: string;
  sku?: string;
  stock_quantity?: number;
  customization_addon_price?: string | number;
  max_text_length?: number;
  allow_image_upload?: boolean;
  allow_custom_text?: boolean;
  allow_color_change?: boolean;
  available_colors?: any[];
}

export interface ApiPrintItem {
  id: number | string;
  name: string;
  item_code?: string;
  category_id?: number;
  category?: {
    id: number;
    name: string;
    slug?: string;
    code?: string;
  };
  description?: string;
  paper_type?: string;
  paper_size?: string;
  print_sides?: string;
  color_mode?: string;
  turnaround_time?: string;
  base_price?: number | string;
  min_quantity?: number;
  status?: string;
}

function sanitizeOrigin(url?: string | null): string {
  if (!url) return '';
  return url.replace(/\/+$/, '').replace(/\/api\/v1\/?$/, '');
}

const envUrl = sanitizeOrigin(process.env.EXPO_PUBLIC_API_URL);

const API_BASE_URLS = Array.from(
  new Set(
    [
      envUrl,
      'http://192.168.1.13:8084',
      'http://192.168.1.13:8082',
      'http://192.168.1.10:8082',
      'http://192.168.1.3:8081',
      'http://localhost:8084',
      'http://localhost:8082',
      'http://127.0.0.1:8084',
      'http://127.0.0.1:8082',
    ].filter(Boolean)
  )
);

export function getApiBaseUrls(): string[] {
  return API_BASE_URLS;
}

/**
 * Fetch dynamic products from backend database
 */
export async function fetchProducts(): Promise<ApiProduct[]> {
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/products`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items)) {
          return items;
        }
      }
    } catch (err) {
      console.warn(`[Api] Failed to fetch products from ${baseUrl}:`, err);
    }
  }
  return [];
}

/**
 * Fetch dynamic print items from backend database: http://192.168.1.3:8081/print-items
 */
export async function fetchPrintItems(): Promise<ApiPrintItem[]> {
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/print-items`, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items)) {
          return items;
        }
      }
    } catch (err) {
      console.warn(`[Api] Failed to fetch print items from ${baseUrl}:`, err);
    }
  }
  return [];
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface ApiOrder {
  id: number | string;
  order_number?: string;
  orderNumber?: string;
  status: 'in_progress' | 'processing' | 'delivered' | 'cancelled' | string;
  placed_at?: string;
  placedOn?: string;
  total?: number | string;
  total_formatted?: string;
  total_display?: string;
  productName?: string;
  image?: string | null;
  items?: any[];
  lineItems?: any[];
}

export async function fetchOrders(email?: string): Promise<ApiOrder[]> {
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const url = cleanEmail
        ? `${baseUrl}/api/v1/orders?customer_email=${encodeURIComponent(cleanEmail)}&email=${encodeURIComponent(cleanEmail)}`
        : `${baseUrl}/api/v1/orders`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items)) return items;
      }
    } catch (err) {
      console.warn('[Api] Failed to fetch orders:', err);
    }
  }
  return [];
}

export async function fetchOrderDetails(id: string | number, email?: string): Promise<ApiOrder | null> {
  const cleanId = String(id).trim().replace(/^#/, '');
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const url = cleanEmail
        ? `${baseUrl}/api/v1/orders/${encodeURIComponent(cleanId)}?customer_email=${encodeURIComponent(cleanEmail)}&email=${encodeURIComponent(cleanEmail)}`
        : `${baseUrl}/api/v1/orders/${encodeURIComponent(cleanId)}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data && (data.order_number || data.orderNumber || data.id)) {
          return data;
        }
      }
    } catch (err) {
      console.warn(`[Api] Failed to fetch order detail from ${baseUrl}:`, err);
    }
  }
  return null;
}

export async function createOrder(payload: Record<string, any>): Promise<Record<string, any>> {
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return json.data || json;
      }
    } catch (err) {
      console.warn(`[Api] Failed to create order on ${baseUrl}:`, err);
    }
  }
  throw new Error('Could not reach any API server to create order');
}

