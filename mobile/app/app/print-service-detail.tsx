import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenHeader from '@/components/screen-header';
import { BrandColors } from '@/constants/theme';
import { fetchPrintServiceBySlug, type ApiPrintService, type ApiPrintServiceSpecification } from '@/utils/api';

export default function PrintServiceDetailScreen() {
  const params = useLocalSearchParams<{ slug: string; name: string }>();
  const router = useRouter();
  const [service, setService] = useState<ApiPrintService | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [isRush, setIsRush] = useState(false);

  useEffect(() => {
    loadService();
  }, []);

  const loadService = async () => {
    try {
      const data = await fetchPrintServiceBySlug(params.slug);
      setService(data);
      if (data?.specifications) {
        const defaults: Record<string, string> = {};
        data.specifications.forEach((spec) => {
          if (spec.options && spec.options.length > 0) {
            defaults[spec.name] = spec.options[0].label;
          }
        });
        setSelectedSpecs(defaults);
      }
    } catch (err) {
      console.warn('[PrintServiceDetail] Error loading service:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!service) return { unitPrice: 0, subtotal: 0, rushFee: 0, total: 0 };
    let unitPrice = Number(service.base_price);
    service.specifications?.forEach((spec) => {
      const selectedLabel = selectedSpecs[spec.name];
      const option = spec.options.find((o) => o.label === selectedLabel);
      if (option?.price_modifier) {
        unitPrice += Number(option.price_modifier);
      }
    });
    const subtotal = unitPrice * quantity;
    let rushFee = 0;
    if (isRush && service.rush_surcharge_type !== 'none') {
      if (service.rush_surcharge_type === 'percentage') {
        rushFee = subtotal * (Number(service.rush_surcharge_amount) / 100);
      } else {
        rushFee = Number(service.rush_surcharge_amount);
      }
    }
    return { unitPrice, subtotal, rushFee, total: subtotal + rushFee };
  };

  const handleSpecChange = (specName: string, value: string) => {
    setSelectedSpecs((prev) => ({ ...prev, [specName]: value }));
  };

  const handleProceed = () => {
    if (!service) return;
    const specs = service.specifications?.map((spec) => {
      const selectedLabel = selectedSpecs[spec.name];
      const option = spec.options.find((o) => o.label === selectedLabel);
      return {
        name: spec.name,
        label: selectedLabel,
        price_modifier: option?.price_modifier ? Number(option.price_modifier) : 0,
      };
    }) || [];

    router.push({
      pathname: '/print-order-checkout',
      params: {
        service_id: String(service.id),
        service_name: service.name,
        service_slug: service.slug,
        specifications: JSON.stringify(specs),
        quantity: String(quantity),
        is_rush: isRush ? '1' : '0',
        unit_price: String(calculatePrice().unitPrice),
        subtotal: String(calculatePrice().subtotal),
        rush_fee: String(calculatePrice().rushFee),
        total: String(calculatePrice().total),
      },
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Loading service details...</Text>
        </View>
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.root}>
        <ScreenHeader />
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Service not found.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const pricing = calculatePrice();

  return (
    <View style={styles.root}>
      <ScreenHeader />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceDesc}>{service.description || 'Professional printing service'}</Text>
          </View>

          {service.specifications && service.specifications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {service.specifications.map((spec) => (
                <View key={spec.id} style={styles.specGroup}>
                  <Text style={styles.specName}>
                    {spec.name}
                    {spec.is_required && <Text style={styles.required}> *</Text>}
                  </Text>
                  <View style={styles.specOptions}>
                    {spec.options.map((option) => {
                      const isSelected = selectedSpecs[spec.name] === option.label;
                      return (
                        <Pressable
                          key={option.label}
                          onPress={() => handleSpecChange(spec.name, option.label)}
                          style={[styles.specOption, isSelected && styles.specOptionSelected]}>
                          <Text style={[styles.specOptionText, isSelected && styles.specOptionTextSelected]}>
                            {option.label}
                          </Text>
                          {option.price_modifier ? (
                            <Text style={[styles.specPrice, isSelected && styles.specPriceSelected]}>
                              +₱{Number(option.price_modifier).toFixed(2)}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyRow}>
              <Pressable
                onPress={() => setQuantity((q) => Math.max(service.min_quantity || 1, q - 1))}
                style={styles.qtyBtn}>
                <Ionicons name="remove" size={20} color="#374151" />
              </Pressable>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Pressable onPress={() => setQuantity((q) => q + 1)} style={styles.qtyBtn}>
                <Ionicons name="add" size={20} color="#374151" />
              </Pressable>
            </View>
          </View>

          {service.rush_surcharge_type !== 'none' && (
            <View style={styles.section}>
              <Pressable
                onPress={() => setIsRush(!isRush)}
                style={styles.rushRow}>
                <View style={styles.rushLeft}>
                  <Ionicons name="flash" size={20} color={isRush ? BrandColors.primary : '#6B7280'} />
                  <View style={styles.rushTextWrap}>
                    <Text style={styles.rushTitle}>Rush Order</Text>
                    <Text style={styles.rushSubtitle}>
                      {service.rush_turnaround_time || 'Faster turnaround'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.checkbox, isRush && styles.checkboxChecked]}>
                  {isRush && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
              </Pressable>
              <Text style={styles.rushFee}>
                {service.rush_surcharge_type === 'percentage'
                  ? `+${service.rush_surcharge_amount}% of subtotal`
                  : `+₱${Number(service.rush_surcharge_amount).toFixed(2)}`}
              </Text>
            </View>
          )}

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Unit Price</Text>
              <Text style={styles.priceValue}>₱{pricing.unitPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal ({quantity} pcs)</Text>
              <Text style={styles.priceValue}>₱{pricing.subtotal.toFixed(2)}</Text>
            </View>
            {isRush && pricing.rushFee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Rush Fee</Text>
                <Text style={styles.priceValue}>₱{pricing.rushFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₱{pricing.total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="document-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Accepted: {service.allowed_file_types?.join(', ') || 'PDF, PNG, JPG'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="server-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>Max file size: {service.max_file_size_mb}MB</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                Turnaround: {service.turnaround_time || '2-3 business days'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleProceed}
          style={({ pressed }) => [styles.proceedBtn, pressed && styles.proceedBtnPressed]}>
          <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
          <Text style={styles.proceedBtnText}>Upload File & Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    paddingBottom: 100,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  backBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  serviceDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  specGroup: {
    gap: 8,
  },
  specName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#EF4444',
  },
  specOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specOptionSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#EFF6FF',
  },
  specOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  specOptionTextSelected: {
    color: BrandColors.primary,
    fontWeight: '600',
  },
  specPrice: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  specPriceSelected: {
    color: BrandColors.primary,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 40,
    textAlign: 'center',
  },
  rushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rushLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rushTextWrap: {
    gap: 2,
  },
  rushTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rushSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  rushFee: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: -6,
  },
  priceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
      },
      android: { elevation: 10 },
    }),
  },
  proceedBtn: {
    backgroundColor: BrandColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedBtnPressed: {
    opacity: 0.9,
  },
  proceedBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
