import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AddressMapPicker, { MapCoordinates } from './address-map-picker';
import { BrandColors } from '@/constants/theme';
import {
  CustomerAddress,
  NominatimResult,
  PsgcItem,
  fetchCustomerAddress,
  fetchPsgcBarangays,
  fetchPsgcCities,
  fetchPsgcProvinces,
  fetchPsgcRegions,
  formatStreetBuildingLabel,
  saveCustomerAddress,
  searchAddress,
} from '@/utils/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  email?: string;
  customerId?: number;
  initialAddress?: CustomerAddress | null;
  onAddressSaved?: (savedAddress: CustomerAddress) => void;
  title?: string;
  subtitle?: string;
}

type PickerType = 'region' | 'province' | 'city' | 'barangay' | null;

export default function PhilippineAddressModal({
  visible,
  onClose,
  email,
  customerId,
  initialAddress,
  onAddressSaved,
  title = 'Delivery Address',
  subtitle = 'Provide your complete Philippine delivery address',
}: Props) {
  // Form fields
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Map & Pin location
  const [pinLocation, setPinLocation] = useState<MapCoordinates | null>(null);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [pinnedSummary, setPinnedSummary] = useState('');

  // Street / Building forward search suggestions
  const [streetSuggestions, setStreetSuggestions] = useState<NominatimResult[]>([]);
  const [isSearchingStreet, setIsSearchingStreet] = useState(false);
  const streetSearchDebounceRef = useRef<any>(null);

  // Selected PSGC Items
  const [selectedRegion, setSelectedRegion] = useState<PsgcItem | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<PsgcItem | null>(null);
  const [selectedCity, setSelectedCity] = useState<PsgcItem | null>(null);
  const [selectedBarangay, setSelectedBarangay] = useState<PsgcItem | null>(null);

  // PSGC Dropdown Lists
  const [regions, setRegions] = useState<PsgcItem[]>([]);
  const [provinces, setProvinces] = useState<PsgcItem[]>([]);
  const [cities, setCities] = useState<PsgcItem[]>([]);
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);

  // Loading States
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active Picker Modal State
  const [activePicker, setActivePicker] = useState<PickerType>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  // ─── Initial Load / Reset ──────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;

    // Load available regions once
    loadRegions();

    if (initialAddress) {
      populateAddress(initialAddress);
    } else if (email || customerId) {
      setLoadingInitial(true);
      fetchCustomerAddress(email, customerId)
        .then((res) => {
          if (res.address) {
            populateAddress(res.address);
          }
        })
        .finally(() => setLoadingInitial(false));
    }
  }, [visible, initialAddress, email, customerId]);

  const populateAddress = async (addr: CustomerAddress) => {
    setRecipientName(addr.recipient_name || '');
    setPhoneNumber(addr.phone_number || '');
    setStreetAddress(addr.street_address || '');
    setPostalCode(addr.postal_code || '');
    setDeliveryInstructions(addr.delivery_instructions || '');

    if (addr.latitude && addr.longitude) {
      setPinLocation({
        latitude: parseFloat(String(addr.latitude)),
        longitude: parseFloat(String(addr.longitude)),
      });
    }

    if (addr.region_code) {
      const regItem: PsgcItem = { code: addr.region_code, name: addr.region_name };
      setSelectedRegion(regItem);

      // Pre-load provinces for region
      const provs = await fetchPsgcProvinces(addr.region_code);
      setProvinces(provs);

      if (provs.length === 0) {
        // Direct cities under region (like NCR)
        const cityList = await fetchPsgcCities(undefined, addr.region_code);
        setCities(cityList);

        if (addr.city_code) {
          const cityItem: PsgcItem = { code: addr.city_code, name: addr.city_name };
          setSelectedCity(cityItem);

          const brgyList = await fetchPsgcBarangays(addr.city_code);
          setBarangays(brgyList);

          if (addr.barangay_code) {
            setSelectedBarangay({ code: addr.barangay_code, name: addr.barangay_name });
          }
        }
      } else if (addr.province_code) {
        const provItem: PsgcItem = { code: addr.province_code, name: addr.province_name };
        setSelectedProvince(provItem);

        // Pre-load cities for province
        const cityList = await fetchPsgcCities(addr.province_code, addr.region_code);
        setCities(cityList);

        if (addr.city_code) {
          const cityItem: PsgcItem = { code: addr.city_code, name: addr.city_name };
          setSelectedCity(cityItem);

          // Pre-load barangays for city
          const brgyList = await fetchPsgcBarangays(addr.city_code);
          setBarangays(brgyList);

          if (addr.barangay_code) {
            setSelectedBarangay({ code: addr.barangay_code, name: addr.barangay_name });
          }
        }
      }
    }
  };

  const loadRegions = async () => {
    setLoadingRegions(true);
    try {
      const data = await fetchPsgcRegions();
      setRegions(data);
    } finally {
      setLoadingRegions(false);
    }
  };

  // ─── Map & Nominatim Auto-Fill ─────────────────────────────────────────────

  const handleLocationSelect = async (coords: MapCoordinates, result: NominatimResult | null) => {
    setPinLocation(coords);
    if (result) {
      setPinnedSummary(result.display_name);
      await autoFillFromNominatim(result);
    }
  };

  const autoFillFromNominatim = async (result: NominatimResult) => {
    setIsAutoFilling(true);
    try {
      const addr = result.address || {};

      // 1. Street Address using formatStreetBuildingLabel to prevent barangay pollution
      const label = formatStreetBuildingLabel(result);
      if (label.streetAddress) {
        setStreetAddress(label.streetAddress);
      }

      // 2. Postal Code
      if (addr.postcode) {
        setPostalCode(addr.postcode.trim());
      }

      // 3. PSGC Cascading Match
      const rawState = (addr.state || '').toLowerCase();
      const rawRegion = (addr.region || '').toLowerCase();
      const rawCounty = (addr.county || '').toLowerCase();
      const rawCity = (addr.city || addr.town || addr.municipality || '').toLowerCase();
      const rawBarangay = (addr.quarter || addr.suburb || addr.neighbourhood || addr.village || '').toLowerCase();

      let currentRegions = regions;
      if (!currentRegions.length) {
        currentRegions = await fetchPsgcRegions();
        setRegions(currentRegions);
      }

      const clean = (s: string) =>
        s
          .toLowerCase()
          .replace(/^(city of|municipality of|barangay|brgy\.?|province of)\s+/i, '')
          .trim();

      // Find matched region
      let matchedReg: PsgcItem | null = null;
      for (const r of currentRegions) {
        const rName = r.name.toLowerCase();
        if (
          (rawRegion.includes('ncr') ||
            rawRegion.includes('metro manila') ||
            rawState.includes('metro manila') ||
            rawCounty.includes('metro manila') ||
            rawCity.includes('manila') ||
            rawCity.includes('quezon city') ||
            rawCity.includes('makati') ||
            rawCity.includes('taguig') ||
            rawCity.includes('pasig') ||
            rawCity.includes('mandaluyong') ||
            rawCity.includes('paranaque') ||
            rawCity.includes('pasay') ||
            rawCity.includes('marikina') ||
            rawCity.includes('valenzuela') ||
            rawCity.includes('caloocan')) &&
          (rName.includes('ncr') || rName.includes('national capital'))
        ) {
          matchedReg = r;
          break;
        }
        if (
          (rawRegion.includes('calabarzon') || rawState.includes('calabarzon') || rawRegion.includes('iv-a')) &&
          (rName.includes('calabarzon') || rName.includes('iv-a'))
        ) {
          matchedReg = r;
          break;
        }
        if (
          (rawRegion.includes('mimaropa') || rawState.includes('mimaropa') || rawRegion.includes('iv-b')) &&
          (rName.includes('mimaropa') || rName.includes('iv-b'))
        ) {
          matchedReg = r;
          break;
        }
        if (
          (rawRegion.includes('central visayas') || rawRegion.includes('vii')) &&
          (rName.includes('central visayas') || rName.includes('vii'))
        ) {
          matchedReg = r;
          break;
        }
        if (
          (rawRegion.includes('western visayas') || rawRegion.includes('vi')) &&
          (rName.includes('western visayas') || rName.includes('vi'))
        ) {
          matchedReg = r;
          break;
        }
        if (
          (rawRegion.includes('central luzon') || rawRegion.includes('iii')) &&
          (rName.includes('central luzon') || rName.includes('iii'))
        ) {
          matchedReg = r;
          break;
        }
        if (rName.includes(rawRegion) || (rawState && rName.includes(rawState))) {
          matchedReg = r;
          break;
        }
      }

      if (matchedReg) {
        setSelectedRegion(matchedReg);

        // Fetch provinces for region
        setLoadingProvinces(true);
        const provs = await fetchPsgcProvinces(matchedReg.code);
        setProvinces(provs);
        setLoadingProvinces(false);

        let matchedProv: PsgcItem | null = null;
        if (provs.length > 0) {
          for (const p of provs) {
            const pClean = clean(p.name);
            if (rawCounty && (pClean.includes(clean(rawCounty)) || clean(rawCounty).includes(pClean))) {
              matchedProv = p;
              break;
            }
            if (rawState && (pClean.includes(clean(rawState)) || clean(rawState).includes(pClean))) {
              matchedProv = p;
              break;
            }
          }
          setSelectedProvince(matchedProv);
        } else {
          setSelectedProvince(null);
        }

        // Fetch cities
        setLoadingCities(true);
        const cityList = await fetchPsgcCities(matchedProv?.code, matchedReg.code);
        setCities(cityList);
        setLoadingCities(false);

        let matchedCityItem: PsgcItem | null = null;
        if (rawCity && cityList.length > 0) {
          const cTarget = clean(rawCity);
          for (const c of cityList) {
            const cClean = clean(c.name);
            if (cClean === cTarget || cClean.includes(cTarget) || cTarget.includes(cClean)) {
              matchedCityItem = c;
              break;
            }
          }
        }

        if (matchedCityItem) {
          setSelectedCity(matchedCityItem);

          // Fetch barangays
          setLoadingBarangays(true);
          const brgyList = await fetchPsgcBarangays(matchedCityItem.code);
          setBarangays(brgyList);
          setLoadingBarangays(false);

          if (rawBarangay && brgyList.length > 0) {
            const bTarget = clean(rawBarangay);
            let matchedBrgyItem: PsgcItem | null = null;
            for (const b of brgyList) {
              const bClean = clean(b.name);
              if (bClean === bTarget || bClean.includes(bTarget) || bTarget.includes(bClean)) {
                matchedBrgyItem = b;
                break;
              }
            }
            if (matchedBrgyItem) {
              setSelectedBarangay(matchedBrgyItem);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[AutoFill] PSGC auto-fill failed:', err);
    } finally {
      setIsAutoFilling(false);
    }
  };

  // ─── Street / Building Forward Search ──────────────────────────────────────

  const handleStreetTextChange = (text: string) => {
    setStreetAddress(text);
    if (streetSearchDebounceRef.current) {
      clearTimeout(streetSearchDebounceRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setStreetSuggestions([]);
      setIsSearchingStreet(false);
      return;
    }

    setIsSearchingStreet(true);
    streetSearchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchAddress(trimmed, selectedCity?.name);
        setStreetSuggestions(results);
      } catch (e) {
        setStreetSuggestions([]);
      } finally {
        setIsSearchingStreet(false);
      }
    }, 400);
  };

  const handleSelectStreetSuggestion = (item: NominatimResult) => {
    const label = formatStreetBuildingLabel(item);
    const chosenStreet = label.streetAddress || label.title;
    setStreetAddress(chosenStreet);
    setStreetSuggestions([]);

    if (item.lat && item.lon) {
      const coords: MapCoordinates = {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      };
      setPinLocation(coords);
      setPinnedSummary(item.display_name);
      autoFillFromNominatim(item);
    }
  };

  // ─── Dependent Selection Handlers ──────────────────────────────────────────

  const handleSelectRegion = async (region: PsgcItem) => {
    setSelectedRegion(region);
    // Reset subordinate levels
    setSelectedProvince(null);
    setSelectedCity(null);
    setSelectedBarangay(null);
    setProvinces([]);
    setCities([]);
    setBarangays([]);

    setActivePicker(null);
    setLoadingProvinces(true);

    try {
      const provs = await fetchPsgcProvinces(region.code);
      setProvinces(provs);

      // If region has NO provinces (e.g. NCR), automatically load its cities directly!
      if (provs.length === 0) {
        setLoadingCities(true);
        const cityList = await fetchPsgcCities(undefined, region.code);
        setCities(cityList);
      }
    } finally {
      setLoadingProvinces(false);
      setLoadingCities(false);
    }
  };

  const handleSelectProvince = async (province: PsgcItem) => {
    setSelectedProvince(province);
    // Reset subordinate levels
    setSelectedCity(null);
    setSelectedBarangay(null);
    setCities([]);
    setBarangays([]);

    setActivePicker(null);
    setLoadingCities(true);

    try {
      const cityList = await fetchPsgcCities(province.code, selectedRegion?.code);
      setCities(cityList);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleSelectCity = async (city: PsgcItem) => {
    setSelectedCity(city);
    // Reset subordinate level
    setSelectedBarangay(null);
    setBarangays([]);

    setActivePicker(null);
    setLoadingBarangays(true);

    try {
      const brgys = await fetchPsgcBarangays(city.code);
      setBarangays(brgys);
    } finally {
      setLoadingBarangays(false);
    }
  };

  const handleSelectBarangay = (barangay: PsgcItem) => {
    setSelectedBarangay(barangay);
    setActivePicker(null);
  };

  // ─── Save Validation & Submission ──────────────────────────────────────────

  const handleSave = async () => {
    if (!recipientName.trim()) {
      Alert.alert('Required Field', 'Please enter the recipient full name.');
      return;
    }
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      Alert.alert('Required Field', 'Please enter a contact phone number.');
      return;
    }
    if (cleanPhone.length !== 11) {
      Alert.alert('Invalid Contact Number', 'Contact number must be exactly 11 digits (e.g., 09XXXXXXXXX).');
      return;
    }
    if (!selectedRegion) {
      Alert.alert('Required Selection', 'Please select a Philippine Region from the dropdown.');
      return;
    }
    const regionHasProvinces = provinces.length > 0;
    if (regionHasProvinces && !selectedProvince) {
      Alert.alert('Required Selection', 'Please select a Province from the dropdown.');
      return;
    }
    if (!selectedCity) {
      Alert.alert('Required Selection', 'Please select a City/Municipality from the dropdown.');
      return;
    }
    if (!selectedBarangay) {
      Alert.alert('Required Selection', 'Please select a Barangay from the dropdown.');
      return;
    }
    if (!streetAddress.trim()) {
      Alert.alert('Required Field', 'Please enter Street, House number, or Building details.');
      return;
    }

    setIsSaving(true);

    const payload = {
      email,
      customer_id: customerId,
      recipient_name: recipientName.trim(),
      phone_number: cleanPhone,
      region_code: selectedRegion.code,
      region_name: selectedRegion.name,
      province_code: selectedProvince ? selectedProvince.code : null,
      province_name: selectedProvince ? selectedProvince.name : null,
      city_code: selectedCity.code,
      city_name: selectedCity.name,
      barangay_code: selectedBarangay.code,
      barangay_name: selectedBarangay.name,
      street_address: streetAddress.trim(),
      postal_code: postalCode.trim() || null,
      latitude: pinLocation ? pinLocation.latitude : null,
      longitude: pinLocation ? pinLocation.longitude : null,
      delivery_instructions: deliveryInstructions.trim() || null,
    };

    try {
      const res = await saveCustomerAddress(payload);
      Alert.alert('Success', 'Your Philippine delivery address has been saved.');
      if (onAddressSaved) {
        onAddressSaved(res.address);
      }
      onClose();
    } catch (err: any) {
      console.warn('[AddressModal] Save failed:', err);
      const msg = err?.data?.message || err?.message || 'Failed to save address. Please check all fields.';
      Alert.alert('Address Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Filtered Items for Active Picker ──────────────────────────────────────
  const getPickerItems = (): PsgcItem[] => {
    let list: PsgcItem[] = [];
    if (activePicker === 'region') list = regions;
    else if (activePicker === 'province') list = provinces;
    else if (activePicker === 'city') list = cities;
    else if (activePicker === 'barangay') list = barangays;

    if (!pickerSearchQuery.trim()) return list;

    const q = pickerSearchQuery.toLowerCase().trim();
    return list.filter((it) => it.name.toLowerCase().includes(q));
  };

  const getPickerTitle = () => {
    switch (activePicker) {
      case 'region':
        return 'Select Region';
      case 'province':
        return 'Select Province';
      case 'city':
        return 'Select City / Municipality';
      case 'barangay':
        return 'Select Barangay';
      default:
        return '';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>
            <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#4B5563" />
            </Pressable>
          </View>

          {loadingInitial ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={BrandColors.primary} />
              <Text style={styles.loadingText}>Loading saved address…</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Badge info */}
              <View style={styles.infoBanner}>
                <Ionicons name="location-outline" size={18} color="#4B5563" />
                <Text style={styles.infoBannerText}>
                  Philippine Standard Geographic Code (PSGC) verified address is required for checkout.
                </Text>
              </View>

              {/* Recipient Details */}
              <Text style={styles.sectionHeading}>Contact & Recipient</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Recipient Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Juan Dela Cruz"
                  placeholderTextColor="#9CA3AF"
                  value={recipientName}
                  onChangeText={setRecipientName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Contact Phone Number *</Text>
                  <Text style={styles.phoneCounterText}>
                    {phoneNumber.replace(/[^0-9]/g, '').length}/11 digits
                  </Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 09171234567"
                  placeholderTextColor="#9CA3AF"
                  value={phoneNumber}
                  onChangeText={(val) => setPhoneNumber(val.replace(/[^0-9]/g, '').slice(0, 11))}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>

              {/* Interactive Map & GPS Auto-Fill */}
              <Text style={styles.sectionHeading}>Interactive Map & Pin Location</Text>
              <AddressMapPicker
                initialCoordinates={pinLocation}
                onLocationSelect={handleLocationSelect}
                pinnedAddressText={pinnedSummary}
                isAutoFilling={isAutoFilling}
                cityContext={selectedCity?.name}
              />

              {/* Dependent Dropdowns */}
              <Text style={styles.sectionHeading}>Philippine Address Hierarchy (PSGC)</Text>

              {/* 1. Region Dropdown */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>1. Region *</Text>
                <Pressable
                  style={[styles.dropdownTrigger, !regions.length && styles.dropdownDisabled]}
                  onPress={() => {
                    setPickerSearchQuery('');
                    setActivePicker('region');
                  }}
                  disabled={loadingRegions}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !selectedRegion && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {loadingRegions
                      ? 'Loading regions…'
                      : selectedRegion
                        ? selectedRegion.name
                        : 'Select Region'}
                  </Text>
                  {loadingRegions ? (
                    <ActivityIndicator size="small" color={BrandColors.primary} />
                  ) : (
                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                  )}
                </Pressable>
              </View>

              {/* 2. Province Dropdown */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  2. Province {selectedRegion && provinces.length === 0 && !loadingProvinces ? '(Not Applicable)' : '*'}
                </Text>
                <Pressable
                  style={[
                    styles.dropdownTrigger,
                    (!selectedRegion || loadingProvinces || (selectedRegion && provinces.length === 0 && !loadingProvinces)) && styles.dropdownDisabled,
                  ]}
                  onPress={() => {
                    if (!selectedRegion) {
                      Alert.alert('Step 1', 'Please select a Region first.');
                      return;
                    }
                    if (provinces.length === 0) {
                      Alert.alert('Not Applicable', 'This region (e.g. NCR) has no provinces. Please select your City directly below.');
                      return;
                    }
                    setPickerSearchQuery('');
                    setActivePicker('province');
                  }}
                  disabled={!selectedRegion || loadingProvinces || (selectedRegion && provinces.length === 0 && !loadingProvinces)}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      (!selectedProvince || (selectedRegion && provinces.length === 0)) && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {loadingProvinces
                      ? 'Loading provinces…'
                      : !selectedRegion
                        ? 'Select Region first'
                        : provinces.length === 0
                          ? 'N/A (Direct to City / Municipality)'
                          : selectedProvince
                            ? selectedProvince.name
                            : 'Select Province'}
                  </Text>
                  {loadingProvinces ? (
                    <ActivityIndicator size="small" color={BrandColors.primary} />
                  ) : (
                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                  )}
                </Pressable>
              </View>

              {/* 3. City / Municipality Dropdown */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>3. City / Municipality *</Text>
                <Pressable
                  style={[
                    styles.dropdownTrigger,
                    (!selectedRegion || loadingCities || (provinces.length > 0 && !selectedProvince)) && styles.dropdownDisabled,
                  ]}
                  onPress={() => {
                    if (!selectedRegion) {
                      Alert.alert('Step 1', 'Please select a Region first.');
                      return;
                    }
                    if (provinces.length > 0 && !selectedProvince) {
                      Alert.alert('Step 2', 'Please select a Province first.');
                      return;
                    }
                    setPickerSearchQuery('');
                    setActivePicker('city');
                  }}
                  disabled={!selectedRegion || loadingCities || (provinces.length > 0 && !selectedProvince)}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !selectedCity && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {loadingCities
                      ? 'Loading cities…'
                      : !selectedProvince
                        ? 'Select Province first'
                        : selectedCity
                          ? selectedCity.name
                          : 'Select City / Municipality'}
                  </Text>
                  {loadingCities ? (
                    <ActivityIndicator size="small" color={BrandColors.primary} />
                  ) : (
                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                  )}
                </Pressable>
              </View>

              {/* 4. Barangay Dropdown */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>4. Barangay *</Text>
                <Pressable
                  style={[
                    styles.dropdownTrigger,
                    (!selectedCity || loadingBarangays) && styles.dropdownDisabled,
                  ]}
                  onPress={() => {
                    if (!selectedCity) {
                      Alert.alert('Step 3', 'Please select a City/Municipality first.');
                      return;
                    }
                    setPickerSearchQuery('');
                    setActivePicker('barangay');
                  }}
                  disabled={!selectedCity || loadingBarangays}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !selectedBarangay && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {loadingBarangays
                      ? 'Loading barangays…'
                      : !selectedCity
                        ? 'Select City first'
                        : selectedBarangay
                          ? selectedBarangay.name
                          : 'Select Barangay'}
                  </Text>
                  {loadingBarangays ? (
                    <ActivityIndicator size="small" color={BrandColors.primary} />
                  ) : (
                    <Ionicons name="chevron-down" size={18} color="#6B7280" />
                  )}
                </Pressable>
              </View>

              {/* Street & Postal Details */}
              <Text style={styles.sectionHeading}>Street & Building Details</Text>

              <View style={[styles.fieldGroup, { zIndex: 50 }]}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Street / Building / House No. / Unit *</Text>
                  {isSearchingStreet && (
                    <ActivityIndicator size="small" color={BrandColors.primary} />
                  )}
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. Unit 4B, Emerald Tower, 24 Ruby St."
                  placeholderTextColor="#9CA3AF"
                  value={streetAddress}
                  onChangeText={handleStreetTextChange}
                  multiline
                  numberOfLines={2}
                />
                {streetSuggestions.length > 0 && (
                  <View style={styles.streetSuggestionsList}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={styles.suggestionsHeaderText}>Suggested Streets & Buildings</Text>
                      <Pressable onPress={() => setStreetSuggestions([])} hitSlop={8}>
                        <Ionicons name="close" size={16} color="#6B7280" />
                      </Pressable>
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {streetSuggestions.map((item, idx) => {
                        const label = formatStreetBuildingLabel(item);
                        return (
                          <Pressable
                            key={`${item.place_id || idx}`}
                            style={styles.suggestionItem}
                            onPress={() => handleSelectStreetSuggestion(item)}
                          >
                            <Ionicons
                              name="business-outline"
                              size={18}
                              color={BrandColors.primary}
                              style={{ marginTop: 2, marginRight: 8 }}
                            />
                            <View style={{ flex: 1 }}>
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
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Postal Code (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1600"
                  placeholderTextColor="#9CA3AF"
                  value={postalCode}
                  onChangeText={setPostalCode}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Delivery Instructions / Landmark (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. Landmark: near chapel, ring buzzer at gate"
                  placeholderTextColor="#9CA3AF"
                  value={deliveryInstructions}
                  onChangeText={setDeliveryInstructions}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Save Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.saveBtnPressed,
                  isSaving && { opacity: 0.7 },
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Philippine Delivery Address</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          )}

          {/* ── Modal Searchable Item Picker ───────────────────────────────────── */}
          <Modal
            visible={activePicker !== null}
            animationType="slide"
            transparent
            onRequestClose={() => setActivePicker(null)}
          >
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                {/* Picker Header */}
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerHeaderTitle}>{getPickerTitle()}</Text>
                  <Pressable hitSlop={8} onPress={() => setActivePicker(null)}>
                    <Ionicons name="close" size={22} color="#374151" />
                  </Pressable>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBarWrap}>
                  <Ionicons name="search" size={18} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search name…"
                    placeholderTextColor="#9CA3AF"
                    value={pickerSearchQuery}
                    onChangeText={setPickerSearchQuery}
                    autoFocus
                  />
                  {pickerSearchQuery.length > 0 && (
                    <Pressable onPress={() => setPickerSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                    </Pressable>
                  )}
                </View>

                {/* Options List */}
                <FlatList
                  data={getPickerItems()}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 24 }}
                  ListEmptyComponent={
                    <View style={styles.emptyListWrap}>
                      <Text style={styles.emptyListText}>No matching locations found.</Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const isSelected =
                      (activePicker === 'region' && selectedRegion?.code === item.code) ||
                      (activePicker === 'province' && selectedProvince?.code === item.code) ||
                      (activePicker === 'city' && selectedCity?.code === item.code) ||
                      (activePicker === 'barangay' && selectedBarangay?.code === item.code);

                    return (
                      <Pressable
                        style={({ pressed }) => [
                          styles.pickerItem,
                          isSelected && styles.pickerItemSelected,
                          pressed && { backgroundColor: '#F3F4F6' },
                        ]}
                        onPress={() => {
                          if (activePicker === 'region') handleSelectRegion(item);
                          else if (activePicker === 'province') handleSelectProvince(item);
                          else if (activePicker === 'city') handleSelectCity(item);
                          else if (activePicker === 'barangay') handleSelectBarangay(item);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && styles.pickerItemTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={BrandColors.primary} />
                        )}
                      </Pressable>
                    );
                  }}
                />
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  phoneCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  pickerHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  pickerItemTextSelected: {
    fontWeight: '700',
    color: BrandColors.primary,
  },
  emptyListWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  streetSuggestionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 6,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 100,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  suggestionsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
