import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@shared/schema";

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
}

interface CartStore {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, size?: string, color?: string) => void;
  removeFromCart: (productId: number, size?: string, color?: string) => void;
  updateQuantity: (productId: number, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (product, quantity = 1, size, color) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.product.id === product.id && i.size === size && i.color === color
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity, size, color }] };
        });
      },
      removeFromCart: (productId, size, color) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product.id === productId && i.size === size && i.color === color)
          ),
        }));
      },
      updateQuantity: (productId, quantity, size, color) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId && i.size === size && i.color === color
              ? { ...i, quantity: Math.max(1, quantity) }
              : i
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      cartTotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.product.discountPrice 
            ? parseFloat(item.product.discountPrice)
            : parseFloat(item.product.price);
          return total + price * item.quantity;
        }, 0);
      },
    }),
    { name: "fashion-cart" }
  )
);
