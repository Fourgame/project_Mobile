import React, { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (item) => {
    if (!item) return;
    const cartId = `${item.id || "item"}_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2, 8)}`;
    setCartItems((prev) => [...prev, { ...item, cartId }]);
  };

  const removeFromCart = (cartId) =>
    setCartItems((prev) => prev.filter((item) => item.cartId !== cartId));

  const clearCart = () => setCartItems([]);

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
    }),
    [cartItems]
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
