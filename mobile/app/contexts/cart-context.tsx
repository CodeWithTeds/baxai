import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

export interface CartCustomization {
  text?: string;
  fontFamily?: string;
  textColor?: string;
  fontSize?: number;
  imageUri?: string;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  placement?: string;
  paperType?: string;
  printSides?: string;
  colorMode?: string;
}

export interface CartItem {
  id: string;
  productId: number | string;
  name: string;
  category: string;
  sku?: string;
  bannerImage?: string | null;
  viewerType?: string;
  basePrice: number;
  addonPrice: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  selectedColor?: string;
  selectedColorName?: string;
  selectedSize?: string;
  customization: CartCustomization;
  stockQuantity: number;
  addedAt: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Derive isolated storage key per user so users never see each other's carts
  const cartStorageKey = useMemo(() => {
    if (user?.id) return `@nuyda_cart_user_${user.id}`;
    if (user?.email) return `@nuyda_cart_user_${user.email.trim().toLowerCase()}`;
    return `@nuyda_cart_guest`;
  }, [user?.id, user?.email]);

  // Load user-specific persisted cart on mount or when user changes
  useEffect(() => {
    let isCancelled = false;

    (async () => {
      try {
        // Clear obsolete legacy shared key so old unowned test items never leak
        await AsyncStorage.removeItem('@placides_cart_v1').catch(() => {});

        const stored = await AsyncStorage.getItem(cartStorageKey);
        if (isCancelled) return;

        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          } else {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      } catch (err) {
        console.warn('[CartContext] Failed to load cart from storage:', err);
        if (!isCancelled) setItems([]);
      } finally {
        if (!isCancelled) setIsLoaded(true);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [cartStorageKey]);

  // Save cart changes to storage under the active user's key
  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      try {
        await AsyncStorage.setItem(cartStorageKey, JSON.stringify(items));
      } catch (err) {
        console.warn('[CartContext] Failed to persist cart:', err);
      }
    })();
  }, [items, isLoaded, cartStorageKey]);

  const addItem = (itemData: Omit<CartItem, 'id' | 'addedAt'>) => {
    const newItem: CartItem = {
      ...itemData,
      id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      addedAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const clampedQty = item.stockQuantity > 0 ? Math.min(quantity, item.stockQuantity) : quantity;
          return {
            ...item,
            quantity: clampedQty,
            totalPrice: Number((item.unitPrice * clampedQty).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  const clearCart = async () => {
    setItems([]);
    try {
      await AsyncStorage.removeItem(cartStorageKey);
      await AsyncStorage.removeItem('@placides_cart_v1').catch(() => {});
    } catch {}
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return Number(items.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2));
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isCartOpen,
      openCart,
      closeCart,
    }),
    [items, itemCount, subtotal, isCartOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
