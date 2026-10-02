import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

import { BrandColors } from '@/constants/theme';

export interface CancelOrderModalProps {
  visible: boolean;
  orderNumber: string;
  onClose: () => void;
  onConfirmCancel: (reason: string) => Promise<boolean | void>;
}

interface ReasonOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PREDEFINED_REASONS: ReasonOption[] = [
  {
    id: 'changed_mind',
    title: 'Changed my mind',
    subtitle: 'I no longer need this custom product',
    icon: 'heart-dislike-outline',
  },
  {
    id: 'modify_design',
    title: 'Need to modify order or artwork',
    subtitle: 'Want to change size, color, text, or uploaded image',
    icon: 'brush-outline',
  },
  {
    id: 'found_cheaper',
    title: 'Found a better price / alternative',
    subtitle: 'Decided on another product or shop',
    icon: 'pricetag-outline',
  },
  {
    id: 'delivery_time',
    title: 'Delivery time is too long',
    subtitle: 'Need the items sooner than estimated',
    icon: 'time-outline',
  },
  {
    id: 'accidental_order',
    title: 'Ordered by mistake or duplicate',
    subtitle: 'Accidental checkout or double submitted',
    icon: 'duplicate-outline',
  },
  {
    id: 'other',
    title: 'Other reason',
    subtitle: 'Tell us your specific reason below',
    icon: 'chatbubble-ellipses-outline',
  },
];

export default function CancelOrderModal({
  visible,
  orderNumber,
  onClose,
  onConfirmCancel,
}: CancelOrderModalProps) {
  const [selectedReasonId, setSelectedReasonId] = useState<string>('changed_mind');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSelectReason = (id: string) => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    setSelectedReasonId(id);
  };

  const handleConfirm = async () => {
    const chosenOption = PREDEFINED_REASONS.find((r) => r.id === selectedReasonId);
    let finalReason = chosenOption?.title || 'Cancelled by customer';

    if (customNotes.trim()) {
      finalReason = `${finalReason}: ${customNotes.trim()}`;
    }

    setSubmitting(true);
    try {
      await onConfirmCancel(finalReason);
    } finally {
      setSubmitting(false);
    }
  };

  const isOther = selectedReasonId === 'other';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={submitting ? undefined : onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={submitting ? undefined : onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View style={styles.sheetContainer}>
            {/* Drag Handle */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="close-circle" size={24} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Cancel Order #{orderNumber}</Text>
                <Text style={styles.headerSubtitle}>
                  Please choose a reason for cancelling this order
                </Text>
              </View>
              <Pressable
                onPress={submitting ? undefined : onClose}
                hitSlop={10}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>

            {/* Reasons List */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionHeading}>SELECT A REASON</Text>

              <View style={styles.reasonsList}>
                {PREDEFINED_REASONS.map((reason) => {
                  const isSelected = selectedReasonId === reason.id;
                  return (
                    <Pressable
                      key={reason.id}
                      onPress={() => handleSelectReason(reason.id)}
                      disabled={submitting}
                      style={({ pressed }) => [
                        styles.reasonCard,
                        isSelected && styles.reasonCardActive,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View
                        style={[
                          styles.reasonIconWrap,
                          isSelected && styles.reasonIconWrapActive,
                        ]}
                      >
                        <Ionicons
                          name={reason.icon}
                          size={18}
                          color={isSelected ? '#DC2626' : '#4B5563'}
                        />
                      </View>

                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text
                          style={[
                            styles.reasonTitle,
                            isSelected && styles.reasonTitleActive,
                          ]}
                        >
                          {reason.title}
                        </Text>
                        <Text style={styles.reasonSubtitle} numberOfLines={1}>
                          {reason.subtitle}
                        </Text>
                      </View>

                      {/* Radio indicator */}
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleActive,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Detailed custom notes text input */}
              <View style={styles.notesSection}>
                <View style={styles.notesLabelRow}>
                  <Text style={styles.notesLabel}>
                    {isOther ? 'DETAILS *' : 'ADDITIONAL COMMENTS (OPTIONAL)'}
                  </Text>
                  <Text style={styles.notesCounter}>{customNotes.length}/200</Text>
                </View>

                <TextInput
                  style={styles.notesInput}
                  placeholder={
                    isOther
                      ? 'Please explain why you need to cancel this order...'
                      : 'Add any specific notes or feedback for our production lab...'
                  }
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  value={customNotes}
                  onChangeText={setCustomNotes}
                  editable={!submitting}
                />
              </View>

              {/* Informational Callout */}
              <View style={styles.infoCallout}>
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCalloutTitle}>What happens next?</Text>
                  <Text style={styles.infoCalloutText}>
                    Your reservation will be cancelled immediately and custom print slots released. If already paid, your refund will process in 3–5 days.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.footer}>
              <Pressable
                onPress={onClose}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.keepBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.keepBtnText}>Keep Order</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={submitting || (isOther && !customNotes.trim())}
                style={({ pressed }) => [
                  styles.confirmBtn,
                  (submitting || (isOther && !customNotes.trim())) && styles.confirmBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>Confirm Cancellation</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    width: '100%',
    maxHeight: '92%',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
    maxHeight: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 12 },
    }),
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Manrope_700Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  reasonsList: {
    gap: 8,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonCardActive: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  reasonIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reasonIconWrapActive: {
    backgroundColor: '#FEE2E2',
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Manrope_700Bold',
  },
  reasonTitleActive: {
    color: '#991B1B',
  },
  reasonSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#DC2626',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  notesSection: {
    marginTop: 2,
  },
  notesLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.6,
  },
  notesCounter: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  infoCalloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 2,
  },
  infoCalloutText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  keepBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    fontFamily: 'Manrope_700Bold',
  },
  confirmBtn: {
    flex: 1.6,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
});
