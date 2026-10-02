import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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

import { BrandColors } from '@/constants/theme';
import {
  CustomerAddress,
  PsgcItem,
  fetchCustomerAddress,
  fetchPsgcBarangays,
  fetchPsgcCities,
  fetchPsgcProvinces,
  fetchPsgcRegions,
  saveCustomerAddress,
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

    if (addr.region_code) {
      const regItem: PsgcItem = { code: addr.region_code, name: addr.region_name };
      setSelectedRegion(regItem);

      // Pre-load provinces for region
      const provs = await fetchPsgcProvinces(addr.region_code);
      setProvinces(provs);

      if (addr.province_code) {
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
    } finally {
      setLoadingProvinces(false);
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
    if (!phoneNumber.trim()) {
      Alert.alert('Required Field', 'Please enter a contact phone number.');
      return;
    }
    if (!selectedRegion) {
      Alert.alert('Required Selection', 'Please select a Philippine Region from the dropdown.');
      return;
    }
    if (!selectedProvince) {
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
      phone_number: phoneNumber.trim(),
      region_code: selectedRegion.code,
      region_name: selectedRegion.name,
      province_code: selectedProvince.code,
      province_name: selectedProvince.name,
      city_code: selectedCity.code,
      city_name: selectedCity.name,
      barangay_code: selectedBarangay.code,
      barangay_name: selectedBarangay.name,
      street_address: streetAddress.trim(),
      postal_code: postalCode.trim() || null,
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
                <Ionicons name="location-outline" size={18} color="#0D9488" />
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
                <Text style={styles.fieldLabel}>Contact Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 0917 123 4567"
                  placeholderTextColor="#9CA3AF"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
              </View>

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
                <Text style={styles.fieldLabel}>2. Province *</Text>
                <Pressable
                  style={[
                    styles.dropdownTrigger,
                    (!selectedRegion || loadingProvinces) && styles.dropdownDisabled,
                  ]}
                  onPress={() => {
                    if (!selectedRegion) {
                      Alert.alert('Step 1', 'Please select a Region first.');
                      return;
                    }
                    setPickerSearchQuery('');
                    setActivePicker('province');
                  }}
                  disabled={!selectedRegion || loadingProvinces}
                >
                  <Text
                    style={[
                      styles.dropdownTriggerText,
                      !selectedProvince && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {loadingProvinces
                      ? 'Loading provinces…'
                      : !selectedRegion
                        ? 'Select Region first'
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
                    (!selectedProvince || loadingCities) && styles.dropdownDisabled,
                  ]}
                  onPress={() => {
                    if (!selectedProvince) {
                      Alert.alert('Step 2', 'Please select a Province first.');
                      return;
                    }
                    setPickerSearchQuery('');
                    setActivePicker('city');
                  }}
                  disabled={!selectedProvince || loadingCities}
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

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Street / Building / House No. / Unit *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. Unit 4B, Emerald Tower, 24 Ruby St."
                  placeholderTextColor="#9CA3AF"
                  value={streetAddress}
                  onChangeText={setStreetAddress}
                  multiline
                  numberOfLines={2}
                />
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
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#0F766E',
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
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
});
