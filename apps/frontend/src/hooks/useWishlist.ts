import React, { useState, useCallback, useEffect } from 'react';

const WISHLIST_KEY = 'at-specialists-wishlist';

function getStoredWishlist(): string[] {
  try {
    const stored = localStorage.getItem(WISHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useWishlist() {
  const [items, setItems] = useState<string[]>(getStoredWishlist);

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  }, [items]);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }, []);

  const isInWishlist = useCallback((id: string) => {
    return items.includes(id);
  }, [items]);

  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    toggleItem,
    isInWishlist,
    clearWishlist,
    count: items.length,
  };
}