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
  unit?: string;
  sku?: string;
  stock_quantity?: number;
  low_stock_alert_at?: number | null;
  is_low_stock?: boolean;
  track_inventory?: boolean;
  thumbnail?: string | null;
  gallery_images?: string[];
  fallback_image?: string | null;
  has_3d_preview?: boolean;
  is_customizable?: boolean;
  viewer_type?: string;
  model_3d_url?: string | null;
  allow_color_change?: boolean;
  available_colors?: string[];
  allow_custom_text?: boolean;
  max_text_length?: number;
  allow_image_upload?: boolean;
  print_method?: string | null;
  print_size?: string | null;
  customization_addon_price?: string | number;
  has_variants?: boolean;
  is_featured_home?: boolean;
  is_featured_services?: boolean;
  sort_order?: number;
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
 * Resolves API base URLs from EXPO_PUBLIC_* env vars set in .env
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL  — full URL e.g. http://192.168.1.4:8081
 *  2. EXPO_PUBLIC_API_HOST + EXPO_PUBLIC_API_PORT — e.g. 192.168.1.4 + 8081
 *
 * No hardcoded IPs — update your .env file to change the server address.
 */
export function getApiBaseUrls(): string[] {
  const envUrl  = process.env.EXPO_PUBLIC_API_URL?.trim();
  const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  const envPort = process.env.EXPO_PUBLIC_API_PORT?.trim();

  const urls: string[] = [];

  if (envUrl) {
    urls.push(envUrl.replace(/\/+$/, ''));
  } else if (envHost) {
    const cleanHost = envHost.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const port = envPort ? `:${envPort}` : '';
    urls.push(`http://${cleanHost}${port}`);
  }

  return Array.from(new Set(urls.filter(Boolean)));
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
        if (Array.isArray(items)) return items;
      }
    } catch (err) {
      console.warn(`[Api] fetchProducts failed at ${baseUrl}:`, err);
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
        if (Array.isArray(items)) return items;
      }
    } catch (err) {
      console.warn(`[Api] fetchPrintItems failed at ${baseUrl}:`, err);
    }
  }
  return [];
}
