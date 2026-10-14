# Map-Based Address Selection with PSGC Auto-Fill — Implementation Plan

## Overview

Enhance the mobile app's address selection with an interactive map (drop pin + current location), free Nominatim geocoding, and automatic PSGC field population. All free APIs, no paid services.

---

## Features

1. **Interactive map** — user taps to drop/move a pin
2. **Current location button** — uses device GPS via `expo-location`
3. **Reverse geocoding** — pin coordinates → full address via Nominatim (free)
4. **PSGC auto-fill** — match reverse geocoded address to region/province/city/barangay
5. **Street suggestions** — Nominatim forward search as user types
6. **Manual override** — user can still edit any PSGC field manually

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `expo-location` | Device GPS access (current location) |
| `react-native-maps` | Map view with draggable pin |

Install:
```bash
npx expo install expo-location react-native-maps
```

---

## Files to Modify

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `mobile/app/components/philippine-address-modal.tsx` | **Edit** | Add map view, pin drop, current location, Nominatim reverse geocode, PSGC auto-fill |
| 2 | `mobile/app/app/delivery-address.tsx` | **Edit** | Same map integration |
| 3 | `mobile/app/utils/api.ts` | **Edit** | Add Nominatim reverse geocode + forward search functions |
| 4 | `mobile/app/package.json` | **Auto** | Updated by `expo install` |

---

## Nominatim API Integration (Free, No API Key)

### Reverse Geocode (Pin → Address)
```
GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1&countrycodes=ph
```

Response:
```json
{
  "display_name": "123 Rizal Avenue, Barangay 1, Manila, Metro Manila, 1000, Philippines",
  "address": {
    "road": "Rizal Avenue",
    "suburb": "Barangay 1",
    "city": "Manila",
    "county": "Metro Manila",
    "state": "NCR",
    "postcode": "1000"
  },
  "lat": "14.5995",
  "lon": "120.9842"
}
```

### Forward Search (Text → Suggestions)
```
GET https://nominatim.openstreetmap.org/search?q={query}&format=json&countrycodes=ph&addressdetails=1&limit=5
```

---

## PSGC Auto-Fill Logic

```
Nominatim response → parse address object:
  address.state   → match regions.name     → region_code
  address.county  → match provinces.name    → province_code
  address.city    → match cities.name       → city_code
  address.suburb  → match barangays.name    → barangay_code
  address.road    → pre-fill street_address
  address.postcode → pre-fill postal_code
```

Matching is done client-side against already-fetched PSGC data (regions, provinces, cities, barangays arrays already in state).

---

## UI Flow

```
Address Modal Opens
  ┌─────────────────────────────────────┐
  │  [Map View with pin]                │
  │  ┌─────────────────────────────┐    │
  │  │                             │    │
  │  │        📍 (pin)             │    │
  │  │                             │    │
  │  └─────────────────────────────┘    │
  │                                     │
  │  [📍 Use My Location]  [🔍 Search]  │
  │                                     │
  │  ── OR ──                           │
  │                                     │
  │  Street: [________________]         │
  │  Region: [Dropdown      ]          │
  │  Province: [Dropdown    ]          │
  │  City: [Dropdown        ]          │
  │  Barangay: [Dropdown    ]          │
  │  Postal: [____]                     │
  │                                     │
  │  [Save Address]                     │
  └─────────────────────────────────────┘
```

### Interaction Flow

1. **Map tap** → drop pin → reverse geocode → auto-fill all fields
2. **"Use My Location"** → get GPS → drop pin at current location → reverse geocode → auto-fill
3. **Street typing** → Nominatim forward search → show suggestions → tap to select → auto-fill PSGC
4. **Manual edit** → user can change any dropdown after auto-fill
5. **Save** → validate → POST to `/api/v1/customer/address`

---

## Implementation Details

### 1. `api.ts` — New Functions

```typescript
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    village?: string;
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

export async function reverseGeocode(lat: number, lon: number): Promise<NominatimResult | null> {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&countrycodes=ph`
    );
    return await res.json();
  } catch {
    return null;
  }
}

export async function searchAddress(query: string): Promise<NominatimResult[]> {
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&countrycodes=ph&addressdetails=1&limit=5`
    );
    return await res.json();
  } catch {
    return [];
  }
}
```

### 2. `philippine-address-modal.tsx` — Map Integration

New state:
```typescript
const [mapRegion, setMapRegion] = useState<{ latitude: number; longitude: number } | null>(null);
const [pinLocation, setPinLocation] = useState<{ latitude: number; longitude: number } | null>(null);
const [isLoadingLocation, setIsLoadingLocation] = useState(false);
const [streetSuggestions, setStreetSuggestions] = useState<NominatimResult[]>([]);
```

New handlers:
```typescript
const handleGetCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;
  setIsLoadingLocation(true);
  const loc = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = loc.coords;
  setPinLocation({ latitude, longitude });
  setMapRegion({ latitude, longitude });
  await handleReverseGeocode(latitude, longitude);
  setIsLoadingLocation(false);
};

const handleMapTap = async (e: any) => {
  const { latitude, longitude } = e.nativeEvent.coordinate;
  setPinLocation({ latitude, longitude });
  await handleReverseGeocode(latitude, longitude);
};

const handleReverseGeocode = async (lat: number, lon: number) => {
  const result = await reverseGeocode(lat, lon);
  if (!result) return;
  // Parse and auto-fill PSGC fields
  const addr = result.address;
  const cityName = addr.city || addr.town || addr.municipality || '';
  const provinceName = addr.county || '';
  const regionName = addr.state || '';
  const barangayName = addr.suburb || addr.village || '';
  
  // Match against loaded PSGC data
  const matchedRegion = regions.find(r => r.name.toLowerCase().includes(regionName.toLowerCase()));
  const matchedProvince = provinces.find(p => p.name.toLowerCase().includes(provinceName.toLowerCase()));
  const matchedCity = cities.find(c => c.name.toLowerCase().includes(cityName.toLowerCase()));
  const matchedBarangay = barangays.find(b => b.name.toLowerCase().includes(barangayName.toLowerCase()));
  
  if (matchedRegion) setSelectedRegion(matchedRegion);
  if (matchedProvince) setSelectedProvince(matchedProvince);
  if (matchedCity) setSelectedCity(matchedCity);
  if (matchedBarangay) setSelectedBarangay(matchedBarangay);
  if (addr.road) setStreetAddress(addr.road);
  if (addr.postcode) setPostalCode(addr.postcode);
};
```

### 3. Map Component (inside modal)

```tsx
import MapView, { Marker, MapPressEvent } from 'react-native-maps';

<MapView
  style={{ height: 200, width: '100%' }}
  initialRegion={{
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }}
  region={mapRegion ? { ...mapRegion, latitudeDelta: 0.01, longitudeDelta: 0.01 } : undefined}
  onPress={handleMapTap}
>
  {pinLocation && (
    <Marker coordinate={pinLocation} draggable onDragEnd={handleMapTap} />
  )}
</MapView>
```

---

## Verification

1. **Map renders** inside address modal
2. **Tap map** → pin drops → reverse geocode fires → fields auto-fill
3. **Current location** → GPS permission → pin at current location → auto-fill
4. **Street typing** → Nominatim suggestions appear → tap to select
5. **Manual override** → dropdowns still work after auto-fill
6. **Save** → address persists with all PSGC codes
7. **No API keys needed** — all free services
