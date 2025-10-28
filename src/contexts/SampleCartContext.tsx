"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type SampleItem = {
  id: string;
  name: string;
  description: string;
  image: string;
};

type SampleCartContextValue = {
  items: SampleItem[];
  addItem: (item: SampleItem) => void;
  removeItem: (id: string) => void;
  isInCart: (id: string) => boolean;
  isFull: boolean;
};

const SampleCartContext = createContext<SampleCartContextValue | null>(null);

const STORAGE_KEY = "archimeuble-sample-cart";
const MAX_ITEMS = 3;

export function SampleCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SampleItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SampleItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed.slice(0, MAX_ITEMS));
        }
      }
    } catch (error) {
      console.error("Failed to read sample cart from storage", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to persist sample cart", error);
    }
  }, [items, isHydrated]);

  const addItem = useCallback((item: SampleItem) => {
    setItems((previous) => {
      if (previous.some((existing) => existing.id === item.id)) {
        return previous;
      }

      if (previous.length >= MAX_ITEMS) {
        return previous;
      }

      return [...previous, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<SampleCartContextValue>(() => {
    const isInCart = (id: string) => items.some((item) => item.id === id);

    return {
      items,
      addItem,
      removeItem,
      isInCart,
      isFull: items.length >= MAX_ITEMS
    };
  }, [addItem, items, removeItem]);

  return <SampleCartContext.Provider value={value}>{children}</SampleCartContext.Provider>;
}

export function useSampleCart() {
  const context = useContext(SampleCartContext);

  if (!context) {
    throw new Error("useSampleCart must be used within a SampleCartProvider");
  }

  return context;
}
