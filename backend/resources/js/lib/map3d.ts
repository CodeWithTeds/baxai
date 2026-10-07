import * as maplibregl from 'maplibre-gl';

export type MapStyleKey =
    | '3d-liberty'
    | '3d-dark'
    | '3d-bright'
    | '3d-positron'
    | '3d-fiord'
    | 'osm'
    | 'voyager'
    | 'satellite'
    | 'dark'
    | 'light'
    | 'topo';

export interface StyleDefinition {
    id: MapStyleKey;
    label: string;
    icon: string;
    description: string;
    isVector: boolean;
    getStyle: () => string | maplibregl.StyleSpecification;
}

export function makeRasterStyle(url: string, attribution: string, maxzoom = 19): maplibregl.StyleSpecification {
    return {
        version: 8,
        sources: {
            'raster-tiles': {
                type: 'raster',
                tiles: [url],
                tileSize: 256,
                attribution,
                maxzoom,
            },
        },
        layers: [
            {
                id: 'base-tiles-layer',
                type: 'raster',
                source: 'raster-tiles',
                minzoom: 0,
                maxzoom: 22,
            },
        ],
    };
}

export const MAP_STYLES: Record<MapStyleKey, StyleDefinition> = {
    '3d-liberty': {
        id: '3d-liberty',
        label: 'Liberty 3D (Vector)',
        icon: '🏙️',
        description: 'OpenFreeMap vector style with extruded 3D buildings (Free, No Key)',
        isVector: true,
        getStyle: () => 'https://tiles.openfreemap.org/styles/liberty',
    },
    '3d-dark': {
        id: '3d-dark',
        label: 'Dark Matter 3D (Vector)',
        icon: '🌃',
        description: 'Dark OpenFreeMap vector style with extruded 3D buildings (Free, No Key)',
        isVector: true,
        getStyle: () => 'https://tiles.openfreemap.org/styles/dark',
    },
    '3d-bright': {
        id: '3d-bright',
        label: 'Bright 3D (Vector)',
        icon: '☀️',
        description: 'High contrast bright vector map with 3D extrusions (Free, No Key)',
        isVector: true,
        getStyle: () => 'https://tiles.openfreemap.org/styles/bright',
    },
    '3d-positron': {
        id: '3d-positron',
        label: 'Positron 3D (Vector)',
        icon: '🏛️',
        description: 'Clean minimalist vector map with building heights (Free, No Key)',
        isVector: true,
        getStyle: () => 'https://tiles.openfreemap.org/styles/positron',
    },
    '3d-fiord': {
        id: '3d-fiord',
        label: 'Fiord 3D (Vector)',
        icon: '🌊',
        description: 'Slate blue modern vector style with 3D buildings (Free, No Key)',
        isVector: true,
        getStyle: () => 'https://tiles.openfreemap.org/styles/fiord',
    },
    satellite: {
        id: 'satellite',
        label: 'Satellite (ESRI)',
        icon: '🛰️',
        description: 'Global photographic satellite imagery (Free, No Key)',
        isVector: false,
        getStyle: () =>
            makeRasterStyle(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                'Source: Esri, Maxar, Earthstar Geographics'
            ),
    },
    osm: {
        id: 'osm',
        label: 'OpenStreetMap',
        icon: '🧭',
        description: 'Standard global OpenStreetMap raster tiles (Free, No Key)',
        isVector: false,
        getStyle: () =>
            makeRasterStyle(
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            ),
    },
    voyager: {
        id: 'voyager',
        label: 'CARTO Streets (Voyager)',
        icon: '🗺️',
        description: 'Clean, colorful, detailed streets raster (Free, No Key)',
        isVector: false,
        getStyle: () =>
            makeRasterStyle(
                'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                '&copy; OpenStreetMap contributors &copy; CARTO'
            ),
    },
    dark: {
        id: 'dark',
        label: 'Dark Matter (Raster)',
        icon: '🌙',
        description: 'High contrast dark theme raster map (Free, No Key)',
        isVector: false,
        getStyle: () =>
            makeRasterStyle(
                'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                '&copy; OpenStreetMap contributors &copy; CARTO'
            ),
    },
    light: {
        id: 'light',
        label: 'Positron (Raster)',
        icon: '⚪',
        description: 'Clean minimalist light raster map (Free, No Key)',
        isVector: false,
        getStyle: () =>
            makeRasterStyle(
                'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                '&copy; OpenStreetMap contributors &copy; CARTO'
            ),
    },
    topo: {
        id: 'topo',
        label: 'OpenTopoMap (Terrain)',
        icon: '🏔️',
        description: 'Topographic contour & hillshade map (Free, No Key)',
        isVector: false,
        getStyle: () =>
            makeRasterStyle(
                'https://tile.opentopomap.org/{z}/{x}/{y}.png',
                '&copy; OpenStreetMap contributors, SRTM'
            ),
    },
};

export function isVectorStyle(key: MapStyleKey): boolean {
    return MAP_STYLES[key]?.isVector ?? false;
}

export function getBaseStyle(key: MapStyleKey): string | maplibregl.StyleSpecification {
    const def = MAP_STYLES[key] ?? MAP_STYLES['3d-liberty'];
    return def.getStyle();
}

export interface Map3DEffectOptions {
    exaggeration?: number;
    enableTerrain?: boolean;
    enableBuildings?: boolean;
    enableSky?: boolean;
    isDark?: boolean;
}

/**
 * Adds 3D buildings, terrain DEM, and atmospheric sky to a MapLibre map instance.
 */
export function add3DEffects(map: maplibregl.Map, opts?: Map3DEffectOptions): void {
    if (!map || !map.isStyleLoaded()) return;

    const style = map.getStyle();
    if (!style || !style.sources) return;

    // 1. Add 3D Terrain DEM if requested
    if (opts?.enableTerrain) {
        try {
            if (!map.getSource('terrain-dem')) {
                map.addSource('terrain-dem', {
                    type: 'raster-dem',
                    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                    encoding: 'terrarium',
                    tileSize: 256,
                    maxzoom: 15,
                });
            }
            if (typeof (map as any).setTerrain === 'function') {
                (map as any).setTerrain({
                    source: 'terrain-dem',
                    exaggeration: opts?.exaggeration ?? 1.2,
                });
            }
        } catch (e) {
            console.warn('Unable to enable 3D terrain:', e);
        }
    } else {
        if (typeof (map as any).setTerrain === 'function') {
            try {
                (map as any).setTerrain(null);
            } catch {
                // ignore
            }
        }
    }

    // 2. Add 3D Extruded Buildings (for vector styles with building sources)
    if (opts?.enableBuildings !== false) {
        try {
            // OpenFreeMap vector styles use 'openmaptiles'
            const sources = style.sources;
            let buildingSource = '';
            if (sources['openmaptiles']) {
                buildingSource = 'openmaptiles';
            } else {
                const vectorKey = Object.keys(sources).find((k) => sources[k].type === 'vector');
                if (vectorKey) buildingSource = vectorKey;
            }

            if (buildingSource && !map.getLayer('3d-buildings')) {
                // Determine label layer or insert before symbol layers
                const layers = style.layers || [];
                let labelLayerId: string | undefined;
                for (let i = 0; i < layers.length; i++) {
                    if (layers[i].type === 'symbol' && (layers[i].layout as any)?.['text-field']) {
                        labelLayerId = layers[i].id;
                        break;
                    }
                }

                map.addLayer(
                    {
                        id: '3d-buildings',
                        source: buildingSource,
                        'source-layer': 'building',
                        type: 'fill-extrusion',
                        minzoom: 13,
                        paint: {
                            'fill-extrusion-color': [
                                'interpolate',
                                ['linear'],
                                ['get', 'render_height'],
                                0,
                                opts?.isDark ? '#334155' : '#e2e8f0',
                                40,
                                opts?.isDark ? '#475569' : '#cbd5e1',
                                100,
                                opts?.isDark ? '#64748b' : '#94a3b8',
                                200,
                                opts?.isDark ? '#94a3b8' : '#64748b',
                            ],
                            'fill-extrusion-height': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                13,
                                0,
                                13.5,
                                ['to-number', ['coalesce', ['get', 'render_height'], ['get', 'height'], 6]],
                            ],
                            'fill-extrusion-base': [
                                'interpolate',
                                ['linear'],
                                ['zoom'],
                                13,
                                0,
                                13.5,
                                ['to-number', ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]],
                            ],
                            'fill-extrusion-opacity': 0.8,
                        },
                    },
                    labelLayerId
                );
            }
        } catch (e) {
            console.warn('Unable to add 3D buildings layer:', e);
        }
    }

    // 3. Add Sky Specification if supported
    if (opts?.enableSky !== false && typeof (map as any).setSky === 'function') {
        try {
            (map as any).setSky({
                'sky-color': opts?.isDark ? '#090d16' : '#87CEEB',
                'horizon-color': opts?.isDark ? '#1e293b' : '#ffffff',
                'sky-horizon-blend': 0.6,
            });
        } catch {
            // ignore
        }
    }
}

/**
 * Removes 3D effects from map.
 */
export function remove3DEffects(map: maplibregl.Map): void {
    if (!map) return;
    try {
        if (typeof (map as any).setTerrain === 'function') {
            (map as any).setTerrain(null);
        }
    } catch {
        // ignore
    }

    try {
        if (map.getLayer('3d-buildings')) {
            map.removeLayer('3d-buildings');
        }
    } catch {
        // ignore
    }
}
