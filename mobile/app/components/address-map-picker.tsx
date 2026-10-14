import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BrandColors } from '@/constants/theme';
import {
  NominatimResult,
  formatStreetBuildingLabel,
  reverseGeocode,
  searchAddress,
} from '@/utils/api';

// Safely require react-native-maps only on native platforms
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
  } catch {
    MapView = null;
    Marker = null;
  }
}

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface Props {
  initialCoordinates?: MapCoordinates | null;
  onLocationSelect: (coords: MapCoordinates, result: NominatimResult | null) => void;
  pinnedAddressText?: string;
  isAutoFilling?: boolean;
  cityContext?: string;
}

const DEFAULT_PH_COORDS: MapCoordinates = {
  latitude: 14.5995, // Manila center
  longitude: 120.9842,
};

export default function AddressMapPicker({
  initialCoordinates,
  onLocationSelect,
  pinnedAddressText,
  isAutoFilling = false,
  cityContext,
}: Props) {
  const [pinLocation, setPinLocation] = useState<MapCoordinates>(
    initialCoordinates || DEFAULT_PH_COORDS
  );
  const [mapRegion, setMapRegion] = useState({
    latitude: initialCoordinates?.latitude || DEFAULT_PH_COORDS.latitude,
    longitude: initialCoordinates?.longitude || DEFAULT_PH_COORDS.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [lastDetectedName, setLastDetectedName] = useState<string>('');

  const searchDebounceRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (initialCoordinates && (initialCoordinates.latitude !== pinLocation.latitude || initialCoordinates.longitude !== pinLocation.longitude)) {
      setPinLocation(initialCoordinates);
      setMapRegion({
        latitude: initialCoordinates.latitude,
        longitude: initialCoordinates.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
    }
  }, [initialCoordinates?.latitude, initialCoordinates?.longitude]);

  // Forward search with debounce
  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAddress(text, cityContext);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Reverse geocode given coordinates & notify parent
  const handleCoordinatesChanged = async (coords: MapCoordinates) => {
    setPinLocation(coords);
    setIsGeocoding(true);
    try {
      const res = await reverseGeocode(coords.latitude, coords.longitude);
      if (res) {
        const label = formatStreetBuildingLabel(res);
        setLastDetectedName(label.streetAddress ? `${label.title} • ${label.subtitle}` : label.subtitle);
      }
      onLocationSelect(coords, res);
    } catch {
      onLocationSelect(coords, null);
    } finally {
      setIsGeocoding(false);
    }
  };

  // User taps map to drop pin
  const handleMapPress = (e: any) => {
    if (!e?.nativeEvent?.coordinate) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newCoords = { latitude, longitude };
    setPinLocation(newCoords);
    handleCoordinatesChanged(newCoords);
  };

  // User drags marker
  const handleMarkerDragEnd = (e: any) => {
    if (!e?.nativeEvent?.coordinate) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const newCoords = { latitude, longitude };
    setPinLocation(newCoords);
    handleCoordinatesChanged(newCoords);
  };

  // Select a forward-search suggestion
  const handleSelectSuggestion = (item: NominatimResult) => {
    setSuggestions([]);
    const label = formatStreetBuildingLabel(item);
    setSearchQuery(label.title);
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      const newCoords = { latitude: lat, longitude: lon };
      setPinLocation(newCoords);
      setMapRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      if (mapRef.current && mapRef.current.animateToRegion) {
        mapRef.current.animateToRegion(
          {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          600
        );
      }
      setLastDetectedName(`${label.title} • ${label.subtitle}`);
      onLocationSelect(newCoords, item);
    }
  };

  // GPS Current Location
  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable device location permissions in Settings to auto-detect your delivery address, or tap anywhere on the map to drop a pin.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setPinLocation(newCoords);
      setMapRegion({
        latitude: newCoords.latitude,
        longitude: newCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      if (mapRef.current && mapRef.current.animateToRegion) {
        mapRef.current.animateToRegion(
          {
            latitude: newCoords.latitude,
            longitude: newCoords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          600
        );
      }

      await handleCoordinatesChanged(newCoords);
    } catch (err: any) {
      Alert.alert(
        'GPS Unavailable',
        err?.message || 'Unable to retrieve GPS coordinates. You can tap on the map to set your pin manually.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Bar with live autocomplete */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={17} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Philippine street, barangay, or city..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchTextChange}
            autoCorrect={false}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={BrandColors.primary} />
          ) : searchQuery.length > 0 ? (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setSuggestions([]);
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        {/* Suggestions Dropdown Overlay */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsList}>
            {suggestions.map((item, idx) => {
              const label = formatStreetBuildingLabel(item);
              const isBuilding = Boolean(
                item.name ||
                item.address?.building ||
                item.address?.amenity ||
                item.address?.shop ||
                item.class === 'building' ||
                item.class === 'shop' ||
                item.class === 'amenity'
              );
              return (
                <Pressable
                  key={`${item.place_id || idx}-${item.lat}-${item.lon}`}
                  style={[
                    styles.suggestionItem,
                    idx === suggestions.length - 1 && styles.suggestionItemLast,
                  ]}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Ionicons
                    name={isBuilding ? 'business' : 'trail-sign'}
                    size={16}
                    color={BrandColors.primary}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.suggestionTitle} numberOfLines={1}>
                      {label.title}
                    </Text>
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                      {label.subtitle}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Map Card */}
      <View style={styles.mapCard}>
        {Platform.OS !== 'web' && MapView ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={mapRegion}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {pinLocation && (
              <Marker
                coordinate={pinLocation}
                draggable
                onDragEnd={handleMarkerDragEnd}
                title="Delivery Location"
                description="Drag pin to refine exact house/drop location"
              />
            )}
          </MapView>
        ) : (
          // Web Fallback: Clean OpenStreetMap preview container
          <View style={styles.webMapFallback}>
            <View style={styles.webPinCenter}>
              <Ionicons name="location" size={32} color="#EF4444" />
              <Text style={styles.webCoordsText}>
                {pinLocation.latitude.toFixed(5)}, {pinLocation.longitude.toFixed(5)}
              </Text>
            </View>
            <Text style={styles.webMapHint}>
              Tap "Use GPS Location" or search street to pin exact delivery coordinates.
            </Text>
          </View>
        )}

        {/* GPS Current Location Floating Button */}
        <Pressable
          style={[styles.locationBtn, isLocating && styles.locationBtnActive]}
          onPress={handleGetCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="navigate" size={16} color="#FFFFFF" />
          )}
          <Text style={styles.locationBtnText}>
            {isLocating ? 'Locating…' : 'Use GPS Location'}
          </Text>
        </Pressable>

        {/* Map Drag Hint Footer */}
        <View style={styles.mapHintBadge}>
          <Ionicons name="finger-print-outline" size={13} color="#4B5563" />
          <Text style={styles.mapHintText}>Tap map or drag pin to auto-fill PSGC</Text>
        </View>
      </View>

      {/* Detected Status & PSGC Auto-fill Banner */}
      {(isGeocoding || isAutoFilling) ? (
        <View style={styles.statusBannerLoading}>
          <ActivityIndicator size="small" color="#0D9488" />
          <Text style={styles.statusBannerTextLoading}>
            Detecting address & matching PSGC hierarchy…
          </Text>
        </View>
      ) : (lastDetectedName || pinnedAddressText) ? (
        <View style={styles.statusBannerSuccess}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.statusBannerTextSuccess} numberOfLines={2}>
            {pinnedAddressText || lastDetectedName}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 6,
  },
  searchSection: {
    position: 'relative',
    zIndex: 20,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    padding: 0,
  },
  suggestionsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 180,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  mapCard: {
    position: 'relative',
    height: 195,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  webMapFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  webPinCenter: {
    alignItems: 'center',
    gap: 4,
  },
  webCoordsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  webMapHint: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  locationBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  locationBtnActive: {
    opacity: 0.8,
  },
  locationBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapHintBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  mapHintText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  statusBannerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBannerTextLoading: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
  },
  statusBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBannerTextSuccess: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
  },
});
