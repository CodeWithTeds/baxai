import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';

export function CartHeaderButton({ tintColor = '#111827' }: { tintColor?: string }) {
  const { itemCount } = useCart();

  const handlePress = () => {
    router.push('/cart');
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.cartBtn, pressed && { opacity: 0.7 }]}
      accessibilityLabel={`Shopping Cart, ${itemCount} items`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="cart-outline" size={22} color={tintColor} />
        {itemCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
});

export default CartHeaderButton;
