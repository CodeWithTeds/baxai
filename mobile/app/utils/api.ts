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
  image_url?: string | null;
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
  expected_delivery?: string;
  expectedDelivery?: string;
  courier_name?: string;
  courierName?: string;
  tracking_number?: string;
  trackingNumber?: string;
  tracking_url?: string;
  trackingUrl?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  can_cancel?: boolean;
  canCancel?: boolean;
  subtotal?: number | string;
  subtotal_formatted?: string;
  customization_total?: number | string;
  customization_total_formatted?: string;
  shipping_fee?: number | string;
  shipping_fee_formatted?: string;
  delivery?: string;
  discount_total?: number | string;
  discount_total_formatted?: string;
  total?: number | string;
  total_formatted?: string;
  total_display?: string;
  payment_method?: string;
  payment_status?: string;
  productName?: string;
  image?: string | null;
  items?: any[];
  lineItems?: any[];
  tracking_steps?: any[];
  trackingSteps?: any[];
  shipping_address?: any;
  notes?: string;
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

export async function apiCancelOrder(
  id: string | number,
  reason: string = 'Cancelled by customer'
): Promise<{ success: boolean; message?: string; order?: ApiOrder }> {
  const cleanId = String(id).trim().replace(/^#/, '');

  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/orders/${encodeURIComponent(cleanId)}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (res.ok && (json.status === 'success' || json.order)) {
        return {
          success: true,
          message: json.message,
          order: json.order?.data || json.order,
        };
      } else {
        return {
          success: false,
          message: json.message || 'Failed to cancel order.',
        };
      }
    } catch (err) {
      console.warn(`[Api] Failed to cancel order at ${baseUrl}:`, err);
    }
  }
  return { success: false, message: 'Could not connect to server to cancel order.' };
}

export interface PsgcItem {
  code: string;
  name: string;
  short_name?: string;
  region_code?: string;
  province_code?: string;
  city_code?: string;
}

export interface CustomerAddress {
  id?: number;
  customer_id?: number;
  is_default?: boolean;
  recipient_name: string;
  phone_number: string;
  region_code: string;
  region_name: string;
  province_code: string;
  province_name: string;
  city_code: string;
  city_name: string;
  barangay_code: string;
  barangay_name: string;
  street_address: string;
  postal_code?: string | null;
  delivery_instructions?: string | null;
  formatted_address?: string;
}

export async function fetchPsgcRegions(): Promise<PsgcItem[]> {
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/psgc/regions`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items)) return items;
      }
    } catch (err) {
      console.warn(`[Api] Failed to fetch regions from ${baseUrl}:`, err);
    }
  }
  return [];
}

export async function fetchPsgcProvinces(regionCode: string): Promise<PsgcItem[]> {
  if (!regionCode) return [];
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/psgc/provinces?region_code=${encodeURIComponent(regionCode)}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items)) return items;
      }
    } catch (err) {
      console.warn(`[Api] Failed to fetch provinces from ${baseUrl}:`, err);
    }
  }
  return [];
}

export async function fetchPsgcCities(provinceCode?: string, regionCode?: string): Promise<PsgcItem[]> {
  if (!provinceCode && !regionCode) return [];
  const query = provinceCode
    ? `province_code=${encodeURIComponent(provinceCode)}`
    : `region_code=${encodeURIComponent(regionCode!)}`;

  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/psgc/cities?${query}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items)) return items;
      }
    } catch (err) {
      console.warn(`[Api] Failed to fetch cities from ${baseUrl}:`, err);
    }
  }
  return [];
}

export async function fetchPsgcBarangays(cityCode: string): Promise<PsgcItem[]> {
  if (!cityCode) return [];
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/psgc/barangays?city_code=${encodeURIComponent(cityCode)}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const items = json.data || json;
        if (Array.isArray(items)) return items;
      }
    } catch (err) {
      console.warn(`[Api] Failed to fetch barangays from ${baseUrl}:`, err);
    }
  }
  return [];
}

export async function fetchCustomerAddress(
  email?: string,
  customerId?: number
): Promise<{ has_complete_address: boolean; address: CustomerAddress | null }> {
  const query = customerId
    ? `customer_id=${customerId}`
    : email
      ? `email=${encodeURIComponent(email.trim().toLowerCase())}`
      : '';

  if (!query) return { has_complete_address: false, address: null };

  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/customer/address?${query}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        return {
          has_complete_address: Boolean(json.has_complete_address),
          address: json.address || null,
        };
      }
    } catch (err) {
      console.warn(`[Api] Failed to fetch customer address from ${baseUrl}:`, err);
    }
  }
  return { has_complete_address: false, address: null };
}

export async function saveCustomerAddress(
  payload: Record<string, any>
): Promise<{ status: string; message: string; address: CustomerAddress; has_complete_address: boolean }> {
  let lastError: any = null;
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/customer/address`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.ok) {
        return json;
      } else {
        const err = new Error(json?.message || 'Failed to save Philippine delivery address');
        (err as any).data = json;
        (err as any).status = res.status;
        throw err;
      }
    } catch (err: any) {
      if (err?.status === 422 || err?.status === 400) {
        throw err;
      }
      lastError = err;
      console.warn(`[Api] Failed to save address on ${baseUrl}:`, err);
    }
  }
  throw lastError || new Error('Could not connect to server to save address');
}

export async function createOrder(payload: Record<string, any>): Promise<Record<string, any>> {
  let lastError: any = null;
  for (const origin of API_BASE_URLS) {
    const baseUrl = sanitizeOrigin(origin);
    try {
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.ok) {
        return json.data || json;
      }

      // If backend returned a validation error (e.g. 422 ADDRESS_REQUIRED or ADDRESS_INCOMPLETE),
      // bubble it up immediately!
      if (res.status === 422 || res.status === 400 || res.status === 403) {
        const err = new Error(json?.message || 'Order could not be created');
        (err as any).status = res.status;
        (err as any).data = json;
        throw err;
      }
    } catch (err: any) {
      if (err?.status === 422 || err?.status === 400 || err?.status === 403) {
        throw err;
      }
      lastError = err;
      console.warn(`[Api] Failed to create order on ${baseUrl}:`, err);
    }
  }
  throw lastError || new Error('Could not reach any API server to create order');
}


