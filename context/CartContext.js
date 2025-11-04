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

  const addToCart = useCallback((item) => {
    if (!item) return;
    const cartId = `${item.id || "item"}_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2, 8)}`;
    setCartItems((prev) => [
      ...prev,
      { ...item, cartId, cartQuantity: 1 },
    ]);
  }, []);

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
