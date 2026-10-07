import { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {
    MapPin,
    Layers,
    RotateCcw,
    Check,
    Mountain,
    Box,
    Compass,
    Sparkles,
} from 'lucide-react';
import {
    MAP_STYLES,
    MapStyleKey,
    isVectorStyle,
    getBaseStyle,
    add3DEffects,
    remove3DEffects,
} from '@/lib/map3d';

if (typeof window !== 'undefined' && maplibregl.setWorkerUrl) {
    maplibregl.setWorkerUrl(workerUrl);
}

export interface MapMarker {
    id: string | number;
    latitude: number;
    longitude: number;
    label?: string;
    subtitle?: string;
    href?: string;
    status?: string;
    raw?: any;
}

export interface MapViewProps {
    markers?: MapMarker[];
    latitude?: number | null;
    longitude?: number | null;
    zoom?: number;
    height?: string;
    className?: string;
    interactive?: boolean;
    initialStyle?: MapStyleKey;
    initial3D?: boolean;
    initialTerrain?: boolean;
    showControls?: boolean;
    onMarkerClick?: (marker: MapMarker) => void;
}

function getStatusColor(status?: string): string {
    switch (status) {
        case 'delivered':
            return '#10B981'; // emerald
        case 'processing':
            return '#8B5CF6'; // purple
        case 'cancelled':
            return '#EF4444'; // red
        case 'in_progress':
        default:
            return '#2563EB'; // blue
    }
}

export default function MapView({
    markers = [],
    latitude,
    longitude,
    zoom = 13,
    height = '360px',
    className = '',
    interactive = true,
    initialStyle = '3d-liberty',
    initial3D = true,
    initialTerrain = false,
    showControls = true,
    onMarkerClick,
}: MapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<maplibregl.Map | null>(null);
    const activeMarkersRef = useRef<maplibregl.Marker[]>([]);

    const [currentStyle, setCurrentStyle] = useState<MapStyleKey>(initialStyle);
    const [is3D, setIs3D] = useState<boolean>(initial3D);
    const [terrainEnabled, setTerrainEnabled] = useState<boolean>(initialTerrain);
    const [showStyleMenu, setShowStyleMenu] = useState<boolean>(false);

    // Filter valid markers
    const validMarkers = markers.filter(
        (m) =>
            typeof m.latitude === 'number' &&
            !isNaN(m.latitude) &&
            typeof m.longitude === 'number' &&
            !isNaN(m.longitude)
    );

    const hasSingleCoords =
        typeof latitude === 'number' &&
        !isNaN(latitude) &&
        typeof longitude === 'number' &&
        !isNaN(longitude);

    const hasAnyCoords = validMarkers.length > 0 || hasSingleCoords;

    const renderMarkers = useCallback((map: maplibregl.Map) => {
        // Clear old markers
        activeMarkersRef.current.forEach((m) => m.remove());
        activeMarkersRef.current = [];

        if (validMarkers.length > 0) {
            validMarkers.forEach((m) => {
                const markerColor = getStatusColor(m.status);
                const marker = new maplibregl.Marker({ color: markerColor })
                    .setLngLat([m.longitude, m.latitude]);

                const el = marker.getElement();
                el.style.cursor = 'pointer';
                el.addEventListener('click', () => {
                    if (onMarkerClick) {
                        onMarkerClick(m);
                    }
                });

                if (m.label || m.subtitle || m.href || onMarkerClick) {
                    const popupEl = document.createElement('div');
                    popupEl.style.cssText =
                        'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; padding: 4px; color: #111827; min-width: 140px;';

                    let html = '';
                    if (m.label) {
                        html += `<strong style="font-size: 12px; display: block; margin-bottom: 2px;">${m.label}</strong>`;
                    }
                    if (m.subtitle) {
                        html += `<div style="color: #6B7280; margin-bottom: 6px;">${m.subtitle}</div>`;
                    }

                    html += `<div style="display: flex; gap: 6px; align-items: center; justify-content: space-between; border-top: 1px solid #E5E7EB; padding-top: 4px; margin-top: 4px;">`;
                    if (onMarkerClick) {
                        html += `<button type="button" class="preview-btn" style="background: #2563EB; color: #ffffff; border: none; padding: 2px 6px; font-size: 10px; font-weight: bold; cursor: pointer; border-radius: 2px;">Preview &rarr;</button>`;
                    }
                    if (m.href) {
                        html += `<a href="${m.href}" style="color: #4B5563; font-size: 10px; text-decoration: underline;">Full Order</a>`;
                    }
                    html += `</div>`;

                    popupEl.innerHTML = html;

                    const previewBtn = popupEl.querySelector('.preview-btn');
                    if (previewBtn) {
                        previewBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (onMarkerClick) {
                                onMarkerClick(m);
                            }
                        });
                    }

                    marker.setPopup(new maplibregl.Popup({ offset: 25, closeButton: false }).setDOMContent(popupEl));
                }

                marker.addTo(map);
                activeMarkersRef.current.push(marker);
            });
        } else if (hasSingleCoords) {
            const marker = new maplibregl.Marker({ color: '#2563EB' })
                .setLngLat([longitude!, latitude!])
                .addTo(map);
            activeMarkersRef.current.push(marker);
        }
    }, [validMarkers, hasSingleCoords, latitude, longitude, onMarkerClick]);

    const apply3DState = useCallback((map: maplibregl.Map, is3dMode: boolean, terrainMode: boolean, styleKey: MapStyleKey) => {
        if (!map) return;
        const isVector = isVectorStyle(styleKey);

        if (is3dMode) {
            if (isVector) {
                add3DEffects(map, {
                    enableTerrain: terrainMode,
                    enableBuildings: true,
                    enableSky: true,
                    isDark: styleKey.includes('dark'),
                });
            } else if (terrainMode) {
                add3DEffects(map, {
                    enableTerrain: true,
                    enableBuildings: false,
                    enableSky: true,
                });
            }
        } else {
            remove3DEffects(map);
        }
    }, []);

    const fitAllMarkers = () => {
        if (!mapInstance.current) return;
        const map = mapInstance.current;
        if (validMarkers.length > 1) {
            const bounds = new maplibregl.LngLatBounds();
            validMarkers.forEach((m) => bounds.extend([m.longitude, m.latitude]));
            map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
        } else if (hasSingleCoords) {
            map.flyTo({ center: [longitude!, latitude!] as [number, number], zoom: 15, duration: 800 });
        } else if (validMarkers.length === 1) {
            map.flyTo({ center: [validMarkers[0].longitude, validMarkers[0].latitude] as [number, number], zoom: 15, duration: 800 });
        }
    };

    const handleToggle3D = () => {
        const next3D = !is3D;
        setIs3D(next3D);

        if (mapInstance.current) {
            const map = mapInstance.current;
            if (next3D) {
                map.easeTo({
                    pitch: 60,
                    bearing: -15,
                    duration: 800,
                });
                apply3DState(map, true, terrainEnabled, currentStyle);
            } else {
                map.easeTo({
                    pitch: 0,
                    bearing: 0,
                    duration: 800,
                });
                apply3DState(map, false, false, currentStyle);
            }
        }
    };

    const handleToggleTerrain = () => {
        const nextTerrain = !terrainEnabled;
        setTerrainEnabled(nextTerrain);

        if (mapInstance.current) {
            apply3DState(mapInstance.current, is3D, nextTerrain, currentStyle);
        }
    };

    const handleResetCompass = () => {
        if (mapInstance.current) {
            mapInstance.current.easeTo({
                pitch: is3D ? 60 : 0,
                bearing: 0,
                duration: 600,
            });
        }
    };

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || !hasAnyCoords) return;

        const defaultCenter: [number, number] = hasSingleCoords
            ? [longitude!, latitude!]
            : [validMarkers[0].longitude, validMarkers[0].latitude];

        const initialStyleSpec = getBaseStyle(currentStyle);

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: initialStyleSpec as any,
            center: defaultCenter,
            zoom,
            pitch: is3D ? 60 : 0,
            bearing: is3D ? -15 : 0,
            maxPitch: 85,
            dragRotate: interactive,
            touchPitch: interactive,
            fadeDuration: 0,
            interactive,
            attributionControl: false,
        });

        map.addControl(
            new maplibregl.AttributionControl({ compact: true }),
            'bottom-right'
        );

        if (interactive) {
            map.addControl(
                new maplibregl.NavigationControl({
                    visualizePitch: true,
                    showCompass: true,
                }),
                'top-right'
            );
        }

        map.on('load', () => {
            renderMarkers(map);
            if (is3D) {
                apply3DState(map, true, terrainEnabled, currentStyle);
            }

            if (validMarkers.length > 1) {
                const bounds = new maplibregl.LngLatBounds();
                validMarkers.forEach((m) => bounds.extend([m.longitude, m.latitude]));
                map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0 });
            }
        });

        mapInstance.current = map;

        return () => {
            activeMarkersRef.current.forEach((m) => m.remove());
            activeMarkersRef.current = [];
            map.remove();
            mapInstance.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Handle Style Switch
    const handleStyleChange = (styleKey: MapStyleKey) => {
        setCurrentStyle(styleKey);
        setShowStyleMenu(false);

        if (mapInstance.current) {
            const map = mapInstance.current;
            const newStyle = getBaseStyle(styleKey);

            map.setStyle(newStyle as any);
            map.once('style.load', () => {
                renderMarkers(map);
                if (is3D) {
                    apply3DState(map, true, terrainEnabled, styleKey);
                }
            });
        }
    };

    // Update markers when props change
    useEffect(() => {
        if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
            renderMarkers(mapInstance.current);
        }
    }, [renderMarkers]);

    if (!hasAnyCoords) {
        return (
            <div
                style={{ height }}
                className={`flex flex-col items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB] text-slate-500 font-mono text-xs p-4 ${className}`}
            >
                <MapPin className="h-6 w-6 text-slate-400 mb-2" />
                <span className="text-[#1A1C1E] font-semibold">Map unavailable</span>
                <span className="text-[11px] text-slate-500 mt-0.5">Address coordinates not geocoded</span>
            </div>
        );
    }

    const vectorStyles = (Object.keys(MAP_STYLES) as MapStyleKey[]).filter(
        (key) => MAP_STYLES[key].isVector
    );
    const rasterStyles = (Object.keys(MAP_STYLES) as MapStyleKey[]).filter(
        (key) => !MAP_STYLES[key].isVector
    );

    return (
        <div style={{ height }} className={`relative w-full overflow-hidden border border-[#E5E7EB] ${className}`}>
            <div ref={mapContainer} className="h-full w-full" />

            {/* FLOATING MAP CONTROLS */}
            {showControls && (
                <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                    {/* STYLE SELECTOR DROPDOWN */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowStyleMenu(!showStyleMenu)}
                            className="flex items-center gap-1.5 border border-[#D1D5DB] bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#1A1C1E] shadow-sm backdrop-blur transition-colors hover:bg-white"
                        >
                            <Layers size={13} className="text-blue-600" />
                            <span>{MAP_STYLES[currentStyle].icon} {MAP_STYLES[currentStyle].label}</span>
                        </button>

                        {showStyleMenu && (
                            <div className="absolute top-full left-0 mt-1 w-72 border border-[#D1D5DB] bg-white p-1 shadow-2xl z-30 max-h-96 overflow-y-auto">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase text-blue-700 bg-blue-50/70 border-b border-blue-100 flex items-center gap-1">
                                    <Sparkles size={11} /> 3D Vector (Extruded Buildings & POIs)
                                </div>
                                {vectorStyles.map((key) => {
                                    const style = MAP_STYLES[key];
                                    const isSelected = currentStyle === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleStyleChange(key)}
                                            className={`flex w-full items-start gap-2 px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-[#F3F4F6] ${
                                                isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-[#374151]'
                                            }`}
                                        >
                                            <span className="text-base leading-none">{style.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span>{style.label}</span>
                                                    {isSelected && <Check size={12} className="text-blue-600 ml-1" />}
                                                </div>
                                                <div className="text-[9px] text-[#6B7280] truncate">{style.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}

                                <div className="px-2 py-1 mt-1 text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border-y border-[#E5E7EB]">
                                    Raster Imagery & Maps
                                </div>
                                {rasterStyles.map((key) => {
                                    const style = MAP_STYLES[key];
                                    const isSelected = currentStyle === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleStyleChange(key)}
                                            className={`flex w-full items-start gap-2 px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-[#F3F4F6] ${
                                                isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-[#374151]'
                                            }`}
                                        >
                                            <span className="text-base leading-none">{style.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span>{style.label}</span>
                                                    {isSelected && <Check size={12} className="text-blue-600 ml-1" />}
                                                </div>
                                                <div className="text-[9px] text-[#6B7280] truncate">{style.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 2D / 3D MODE TOGGLE PILL */}
                    <button
                        type="button"
                        onClick={handleToggle3D}
                        title={is3D ? 'Switch to flat 2D top-down view' : 'Switch to tilted 3D extruded view'}
                        className={`flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur transition-colors ${
                            is3D
                                ? 'border-blue-600 bg-blue-600 text-white shadow-blue-500/20'
                                : 'border-[#D1D5DB] bg-white/95 text-[#374151] hover:bg-white'
                        }`}
                    >
                        <Box size={13} className={is3D ? 'text-white' : 'text-slate-500'} />
                        <span>{is3D ? '3D Active' : '2D Mode'}</span>
                    </button>

                    {/* TERRAIN DEM TOGGLE */}
                    <button
                        type="button"
                        onClick={handleToggleTerrain}
                        title={terrainEnabled ? 'Disable 3D Elevation Terrain' : 'Enable 3D Elevation Terrain DEM'}
                        className={`flex items-center gap-1 border px-2 py-1 text-[11px] font-medium shadow-sm backdrop-blur transition-colors ${
                            terrainEnabled
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-[#D1D5DB] bg-white/95 text-[#4B5563] hover:bg-white hover:text-[#1A1C1E]'
                        }`}
                    >
                        <Mountain size={12} />
                        <span>Terrain</span>
                    </button>

                    {/* RE-CENTER / FIT BOUNDS BUTTON */}
                    <button
                        type="button"
                        onClick={fitAllMarkers}
                        title="Re-center all delivery markers"
                        className="flex items-center gap-1 border border-[#D1D5DB] bg-white/95 px-2 py-1 text-[11px] font-medium text-[#4B5563] shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#1A1C1E]"
                    >
                        <RotateCcw size={12} />
                        <span>Fit Pins</span>
                    </button>

                    {/* COMPASS RESET */}
                    {is3D && (
                        <button
                            type="button"
                            onClick={handleResetCompass}
                            title="Reset camera heading to North"
                            className="flex items-center gap-1 border border-[#D1D5DB] bg-white/95 px-2 py-1 text-[11px] font-medium text-[#4B5563] shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#1A1C1E]"
                        >
                            <Compass size={12} />
                            <span>North</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
