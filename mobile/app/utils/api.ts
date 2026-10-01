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

const API_BASE_URLS = Array.from(new Set([
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.3:8081',
  'http://192.168.1.3:8081',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
]));

/**
 * Fetch dynamic products from backend database: http://192.168.1.3:8081/products
 */
export async function fetchProducts(): Promise<ApiProduct[]> {
  for (const baseUrl of API_BASE_URLS) {
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
  for (const baseUrl of API_BASE_URLS) {
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
