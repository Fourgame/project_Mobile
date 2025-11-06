import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const resolveCartKey = useCallback((entry) => {
    if (!entry) return null;
    if (entry.cartKey) return entry.cartKey;
    if (typeof entry.id === "string" && entry.id) return entry.id;
    if (typeof entry.productId === "string" && entry.productId)
      return entry.productId;
    if (entry.ownerId && entry.docId) return `${entry.ownerId}_${entry.docId}`;
    if (entry.docId) return entry.docId;
    if (entry.ownerId && entry.name) return `${entry.ownerId}_${entry.name}`;
    if (entry.category && entry.name) return `${entry.category}_${entry.name}`;
    if (entry.name) return entry.name;
    if (entry.picture) return entry.picture;
    return null;
  }, []);

  const addToCart = useCallback(
    (item) => {
      if (!item) return { status: "error" };
      const cartKey = resolveCartKey(item);
      const stock = Number(item.quantity);
      let outcome = "added";

      setCartItems((prev) => {
        const index = prev.findIndex(
          (entry) => resolveCartKey(entry) === cartKey
        );

        if (index !== -1) {
          const existing = prev[index];
          const currentQty = Number.isFinite(existing.cartQuantity)
            ? existing.cartQuantity
            : 1;
          const maxQty =
            Number.isFinite(stock) && stock > 0 ? stock : Number.POSITIVE_INFINITY;

          if (currentQty >= maxQty) {
            outcome = "max";
            return prev;
          }

          const updated = [...prev];
          updated[index] = {
            ...existing,
            ...item,
            cartId: existing.cartId,
            cartKey: existing.cartKey ?? cartKey,
            cartQuantity: Math.min(currentQty + 1, maxQty),
          };
          return updated;
        }

        const cartId =
          cartKey ||
          `${item.id || "item"}_${Date.now()}_${Math.random()
            .toString(16)
            .slice(2, 8)}`;

        return [
          ...prev,
          {
            ...item,
            cartId,
            cartKey: cartKey ?? null,
            cartQuantity: 1,
          },
        ];
      });

      return { status: outcome };
    },
    [resolveCartKey]
  );

  const removeFromCart = useCallback(
    (cartId) =>
      setCartItems((prev) => prev.filter((item) => item.cartId !== cartId)),
    []
  );

  const updateCartQuantity = useCallback((cartId, nextQuantity) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, cartQuantity: nextQuantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
    }),
    [cartItems, addToCart, removeFromCart, updateCartQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
};
