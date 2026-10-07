# Admin 3D Map with MapLibre — Implementation Plan

> Scope: `backend/` (Laravel + Inertia Vue 3) only. No mobile, no API changes.
> Targets: `CollectionTracking/Index.vue` (live), `History.vue` (route modal). `LocationPreviewMap.vue` stays 2D.

## 1. Context & Current State

- Loader: `resources/views/app.blade.php:65-66` loads `maplibre-gl@3.6.2` via CDN as `window.maplibregl`. No npm dep (`package.json` has no `maplibre-gl`). All map code uses `(window as any).maplibregl`.
- Live map: `resources/js/pages/CollectionTracking/Index.vue`
  - `getStyle(key):28-95` — `satellite/streets/dark/light/terrain` = single `type:raster` source. `3d/voyager/positron` = CARTO GL JSON URL, but never adds 3D layers.
  - `initMap:109-137` — `pitch:45, zoom:13`, `NavigationControl()` without `visualizePitch`.
  - `updateCollectorMarkers:241-409` — canvas icons + `collectors` GeoJSON `symbol` layer + popup on `click`. Correct pattern.
  - `toggleTrail:168-236` + re-add in `375-408` — `snail-trail-{id}` `line` layers from `/superadmin/tracking/trail/{id}`.
  - `switchMapStyle:97-106` — `setStyle()` + `once('style.load', updateCollectorMarkers)`. Must be extended (style wipe).
  - Poll: `fetchLocations:140-148` every 5s via `locations().url`.
- History modal: `resources/js/pages/CollectionTracking/History.vue`
  - `getStyle:51-105` raster only, `initRouteMap:172-192` `pitch:0`, `drawRoute:194-269` OSRM `route/v1/driving` + `route` line layer + `fitBounds`.
- Problem: raster tiles cannot extrude. Current "3D" label is just tilt. No `fill-extrusion`, no `raster-dem` terrain, no `sky`, no `maxPitch:85`.

## 2. Goal / Non-Goals

- Goal: true 3D on admin live map — extruded buildings + optional terrain + 2D/3D toggle, markers/trails/routes preserved across style switches.
- Stretch: same 3D in History route modal.
- Non-goals: mobile WebView, offline tiles, new backend endpoints, MapTiler paid key, globe projection.

## 3. Technical Design

### 3.1 Version

- Option A (recommended): `npm i maplibre-gl@^4.7` + `import maplibregl from 'maplibre-gl'` + CSS import. Fixes `(window as any)` types, enables `SkySpecification`, `setTerrain`, `setSky`.
- Option B (zero-build): bump CDN in `app.blade.php` to `4.x`. Keep `window` usage. Faster but keeps `any` debt.
- Decision needed, default to A.

### 3.2 Base styles (free, keyless)

- Keep raster for `satellite` (Esri), `streets` (OSM), `dark/light` (CARTO raster), `terrain` (OpenTopoMap).
- Vector for true 3D: `https://tiles.openfreemap.org/styles/liberty` (default) or keep `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`. Both expose `source: openmaptiles` with `source-layer: building`.
- If CARTO kept, verify `source-layer` name is `building` before writing layer.

### 3.3 3D layers helper

New `resources/js/composables/useMap3D.ts`:

```ts
export function getBaseStyle(key: string): StyleSpecification
export function add3DEffects(map: Map, opts?: { exaggeration?: number }): void
export function remove3DEffects(map: Map): void
export function isVectorStyle(key: string): boolean
```

- `add3DEffects`:
  1. `terrain-dem` source: `{ type:'raster-dem', tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding:'terrarium', tileSize:256, maxzoom:15 }` → `map.setTerrain({ source:'terrain-dem', exaggeration: 1.2 })`
  2. `3d-buildings` layer: `{ id:'3d-buildings', source:'openmaptiles', 'source-layer':'building', type:'fill-extrusion', minzoom:14, paint:{ 'fill-extrusion-color':'#aab', 'fill-extrusion-height':['get','render_height'], 'fill-extrusion-base':['get','render_min_height'], 'fill-extrusion-opacity':0.6 } }`
  3. Optional `sky`: `map.setSky({ 'sky-color':'#199EF3', 'horizon-color':'#ffffff' })` (v4+ only).
- Guard with `map.getSource / map.getLayer` checks. No-op on raster styles.

### 3.4 Camera & controls

- `new Map({ pitch:60, maxPitch:85, bearing:0, dragRotate:true, touchPitch:true, fadeDuration:0, ... })`
- `new NavigationControl({ visualizePitch:true })`
- 2D/3D toggle: `map.easeTo({ pitch:0, bearing:0, duration:800 })` vs `map.easeTo({ pitch:65, bearing:-15, duration:800 })` + toggle `visibility` of `3d-buildings` + `setTerrain(null)` vs `setTerrain(...)`.

## 4. Implementation Steps

### Step 1 — Setup (30 min)

1. `npm i -S maplibre-gl@^4.7` (or bump CDN).
2. Create `resources/js/composables/useMap3D.ts` per §3.3.
3. Add `maplibre-gl/dist/maplibre-gl.css` import if npm route.

### Step 2 — `Index.vue` live map (main task)

1. Replace local `getStyle/styleOptions` with `useMap3D.getBaseStyle`. Keep keys: `satellite, streets, dark, light, terrain, 3d-vector, voyager, positron`. Default `activeStyle='3d-vector'` or keep `satellite`.
2. Update `initMap` camera + control per §3.4. On `load`: if `isVectorStyle(activeStyle)` → `add3DEffects(map)`, then existing bounds fit.
3. Update `switchMapStyle`: `map.setStyle(getBaseStyle(name)); map.once('style.load', () => { add3DEffects(map) if vector; updateCollectorMarkers(); reAddTrails(); })`. Extract trail re-add from `375-408` into `reAddTrails()` to avoid duplication.
4. Add UI: split existing style switcher `489-505` into style group + `2D | 3D` pill button bound to `is3D` ref. Style with Tailwind, respect `dark:` variant already used.
5. Keep `updateCollectorMarkers`, `toggleTrail`, `centerOnCollector:411-419`, polling `421-427`, cleanup `429-437` unchanged except type `map: Map | null` instead of `any`.

### Step 3 — `History.vue` modal (stretch, 1h)

1. Import `useMap3D`. Add `is3D` ref + toggle in modal header `509-526`.
2. `initRouteMap`: add `maxPitch:85, dragRotate:true`; on `load`: `add3DEffects` + `drawRoute`.
3. `switchMapStyle:107-118`: same `style.load → add3DEffects + drawRoute` pattern.
4. Ensure `closeModal:162-170` + `onUnmounted:271-276` call `map.remove()` (already does).

### Step 4 — Explicitly out of scope

- `LocationPreviewMap.vue`: no change.

## 5. Verification

- `npm run types:check` passes (no `any` for map).
- `npm run build` passes, `php artisan test` passes (no backend change).
- Manual checklist:
  - [ ] Manila `[121.0494,14.6507] z16` shows extruded blocks in `3d-vector`, flat in `satellite`.
  - [ ] 2D↔3D toggle animates pitch, buildings/terrain appear/disappear.
  - [ ] Style switch satellite→3d→satellite keeps collector symbols, popups, active trails.
  - [ ] Trail toggle + 5s poll don't flicker in 3D.
  - [ ] History modal route drapes over terrain, `fitBounds padding:60` still frames both markers.
  - [ ] `maplibregl.supported()===false` falls back to `pitch:0`, no JS error.
  - [ ] Dark mode popup CSS `620-634` still readable in 3D.

## 6. Risks & Mitigations

- `setStyle` wipes custom layers → always re-add via `style.load`. Already partially done, extend to 3D + trails.
- Raster styles can't extrude → `add3DEffects` no-ops; UI disables 3D toggle with tooltip when raster active.
- Terrain doubles tile requests + DEM CORS → default `exaggeration:0` (buildings only), terrain opt-in toggle. Use AWS Terrarium (CORS-open, free).
- CARTO vs OpenFreeMap `source-layer` mismatch → log `map.getStyle().sources` once, assert `building` layer exists before adding extrusion; fallback to no buildings + console.warn.
- v3→v4 breaking: `map.addImage` signature + CSS path → test popup/marker canvas code `266-303` unchanged, only import changes.

## 7. Open Questions

1. Vector base: OpenFreeMap `liberty` (better PH buildings) or stay on CARTO `dark-matter-gl`?
2. Scope lock: `Index.vue` only, or include `History.vue` modal in same PR?
3. Terrain default ON (`exaggeration:1.2`) or OFF (buildings only for perf)? Recommended OFF first.
4. npm install (A) vs CDN bump (B)?
