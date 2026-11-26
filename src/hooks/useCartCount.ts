import { useEffect, useState } from 'react';
import { useCustomer } from '@/context/CustomerContext';
import { fetchCartCount, onCartChanged } from '@/lib/cartCount';

// Nombre d'articles du panier du visiteur identifié par email ; sans identification, il n'a pas de panier
export function useCartCount(): number {
  const { customer } = useCustomer();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    const refresh = () => {
      fetchCartCount().then((total) => {
        if (!cancelled) setCount(total);
      });
    };
    refresh();
    const stopListening = onCartChanged((total) => (total === undefined ? refresh() : setCount(total)));
    return () => {
      cancelled = true;
      stopListening();
    };
  }, [customer]);

  return customer ? count : 0;
}
