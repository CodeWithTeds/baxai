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

/**
 * Dynamically resolves API base URLs prioritized by .env environment settings
 */
export function getApiBaseUrls(): string[] {
  const envHost = process.env.EXPO_PUBLIC_API_HOST || process.env.EXPO_PUBLIC_HOST || process.env.HOST || '192.168.100.184';
  const envPort = process.env.EXPO_PUBLIC_API_PORT || '8081';
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  const dynamicUrls: string[] = [];

  if (envUrl) {
    dynamicUrls.push(envUrl.replace(/\/$/, ''));
  }

  if (envHost) {
    const cleanHost = envHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
    dynamicUrls.push(`http://${cleanHost}:${envPort}`);
    if (envPort !== '8081') dynamicUrls.push(`http://${cleanHost}:8081`);
    if (envPort !== '8082') dynamicUrls.push(`http://${cleanHost}:8082`);
    if (envPort !== '8000') dynamicUrls.push(`http://${cleanHost}:8000`);
  }

  // Fallback defaults
  dynamicUrls.push(
    'http://192.168.100.184:8081',
    'http://192.168.100.184:8082',
    'http://192.168.1.3:8081',
    'http://localhost:8081',
    'http://127.0.0.1:8081'
  );

  return Array.from(new Set(dynamicUrls.filter(Boolean)));
}

export const API_BASE_URLS = getApiBaseUrls();

/**
 * Fetch dynamic products from backend database
 */
export async function fetchProducts(): Promise<ApiProduct[]> {
  const urls = getApiBaseUrls();
  for (const baseUrl of urls) {
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
 * Fetch dynamic print items from backend database
 */
export async function fetchPrintItems(): Promise<ApiPrintItem[]> {
  const urls = getApiBaseUrls();
  for (const baseUrl of urls) {
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
