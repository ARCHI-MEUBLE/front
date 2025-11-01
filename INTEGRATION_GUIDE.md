# Guide d'intégration Stripe avec le panier existant

## 📌 Situation actuelle

Vous avez:
- ✅ Une page `/checkout.tsx` existante (liée au backend PHP)
- ✅ Un panier qui charge les données depuis PHP
- ✅ Une API PHP pour créer les commandes

Vous avez maintenant:
- ✅ Une page `/stripe-payment.tsx` (universelle, réutilisable)
- ✅ Une API `/api/stripe-checkout.ts` pour créer des sessions Stripe
- ✅ Pages de succès/annulation

## 🎯 Décision: Quelle approche choisir?

### Option 1: Garder les 2 systèmes parallèles
```
/checkout          → Système actuel (PHP backend)
/stripe-payment    → Nouveau système Stripe
```
✅ Avantage: Pas de risque, pouvoir tester Stripe en parallèle
❌ Inconvénient: Maintenance de 2 systèmes

### Option 2: Remplacer progressivement
```
/checkout          → Redirige vers /stripe-payment
/stripe-payment    → Nouveau système Stripe
```
✅ Avantage: Une seule URL pour l'utilisateur
❌ Inconvénient: Nécessite coordination avec backend PHP

### Option 3: Intégrer Stripe au checkout existant
```
/checkout          → Utilise Stripe pour le paiement (garder le reste)
```
✅ Avantage: Meilleures pratiques
❌ Inconvénient: Refonte plus complexe

**👉 Recommandation: Option 1 (2 systèmes parallèles) pour commencer**

---

## 🔄 Intégration - Option 1: Systèmes parallèles

### Étape 1: Ajouter un lien pour tester Stripe

Dans votre page de panier (`panier.tsx`):

```typescript
import Link from 'next/link';

export default function CartPage() {
  return (
    <div>
      {/* Bouton existant pour le checkout PHP */}
      <button onClick={handleExistingCheckout}>
        Finaliser la commande (ancien système)
      </button>

      {/* Nouveau bouton pour tester Stripe */}
      <Link href="/stripe-payment">
        <button className="bg-blue-500">
          💳 Tester le nouveau paiement Stripe
        </button>
      </Link>

      {/* Note */}
      <p className="text-sm text-gray-500">
        Le nouveau système Stripe est en test. Les 2 systèmes coexistent.
      </p>
    </div>
  );
}
```

### Étape 2: Adapter la page Stripe au panier existant

Ouvrir: `src/pages/stripe-payment.tsx`

Remplacer cette partie (lignes 70-80):
```typescript
// ❌ Données simulées
const [order, setOrder] = useState<Order>({
  items: [
    { name: 'Échantillon de bois', price: 5, quantity: 1 },
    { name: 'Livraison', price: 4, quantity: 1 },
  ],
  total: 9,
});
```

Par ceci (charger depuis votre API PHP):
```typescript
// ✅ Charger depuis votre backend
const [order, setOrder] = useState<Order | null>(null);
const [isLoadingCart, setIsLoadingCart] = useState(true);

useEffect(() => {
  const loadCart = async () => {
    try {
      const response = await fetch(
        'http://localhost:8000/backend/api/cart/index.php',
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Panier vide');

      const cartData = await response.json();

      // Transformer le format de votre API au format Stripe
      setOrder({
        items: cartData.items.map((item: any) => ({
          name: item.configuration.name,
          price: item.configuration.price,
          quantity: item.quantity,
        })),
        total: cartData.total,
      });
    } catch (err) {
      console.error('Erreur panier:', err);
      // Rediriger si panier vide
      router.push('/panier');
    } finally {
      setIsLoadingCart(false);
    }
  };

  loadCart();
}, [router]);
```

Puis adapter le rendu (ligne ~150):
```typescript
// Ajouter après le chargement de Stripe
if (isLoadingCart || isLoadingStripe) {
  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-text-secondary">Chargement du panier...</p>
      </div>
    </div>
  );
}

if (!order) return null;
```

### Étape 3: Pré-remplir l'adresse du client authentifié

Ajouter ceci après le chargement du panier:

```typescript
import { useCustomer } from '@/context/CustomerContext';

// Dans le composant
const { customer, isAuthenticated } = useCustomer();

// Dans useEffect, après loadCart
if (isAuthenticated && customer) {
  setFormData(prev => ({
    ...prev,
    fullName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
    address: customer.address || '',
    postalCode: customer.postal_code || '',
    city: customer.city || '',
    country: customer.country || 'France',
  }));
}
```

---

## 🔄 Intégration - Option 2: Redirection progressive

### Étape 1: Modifier `/checkout.tsx` pour rediriger vers Stripe

Remplacer le formulaire existant par une redirection:

```typescript
export default function Checkout() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers le nouveau système Stripe
    router.push('/stripe-payment');
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center">
      <div className="text-center">
        <p>Redirection vers le paiement sécurisé...</p>
      </div>
    </div>
  );
}
```

### Étape 2: Copier la logique de `/checkout.tsx` à `/stripe-payment.tsx`

Toute la logique de chargement du panier et du client doit venir de `/checkout.tsx`:

```typescript
// À copier de checkout.tsx vers stripe-payment.tsx
import { useCustomer } from '@/context/CustomerContext';

const { customer, isAuthenticated, isLoading: authLoading } = useCustomer();

useEffect(() => {
  if (authLoading) return;

  if (!isAuthenticated) {
    router.push('/auth/login?redirect=/stripe-payment');
    return;
  }

  loadCart();

  if (customer) {
    // Pré-remplir adresse
    setFormData(prev => ({
      ...prev,
      fullName: `${customer.first_name} ${customer.last_name}`,
      address: customer.address || '',
      postalCode: customer.postal_code || '',
      city: customer.city || '',
      country: customer.country || 'France',
    }));
  }
}, [isAuthenticated, authLoading, customer, router]);

const loadCart = async () => {
  try {
    const response = await fetch(
      'http://localhost:8000/backend/api/cart/index.php',
      { credentials: 'include' }
    );

    if (!response.ok) {
      throw new Error('Erreur lors du chargement du panier');
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      router.push('/panier');
      return;
    }

    setOrder({
      items: data.items.map((item: any) => ({
        name: item.configuration.name,
        price: item.configuration.price,
        quantity: item.quantity,
      })),
      total: data.total,
    });
  } catch (err: any) {
    setError(err.message || 'Erreur');
  } finally {
    setIsLoading(false);
  }
};
```

---

## 💳 Intégration - Option 3: Remplacer le paiement

Si vous voulez garder le formulaire existant mais utiliser Stripe pour le paiement:

### Étape 1: Modifier `/checkout.tsx`

Remplacer l'appel à l'API PHP par un appel Stripe:

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setError('');

  // Validation existante
  if (!formData.shipping_address || !formData.shipping_city || !formData.shipping_postal_code) {
    setError('Veuillez remplir tous les champs obligatoires');
    return;
  }

  setIsSubmitting(true);

  try {
    // ✅ NOUVEAU: Utiliser Stripe au lieu de PHP
    const checkoutData = {
      items: cart.items.map((item: any) => ({
        name: item.configuration.name,
        price: Math.round(item.configuration.price * 100), // Centimes
        quantity: item.quantity,
      })),
      shippingAddress: {
        fullName: `${customer.first_name} ${customer.last_name}`,
        address: formData.shipping_address,
        postalCode: formData.shipping_postal_code,
        city: formData.shipping_city,
        country: formData.shipping_country,
      },
      customerId: customer.id,
      orderId: Date.now().toString(),
    };

    const response = await fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la création de la session');
    }

    const { url } = await response.json();

    // Rediriger vers Stripe Checkout
    if (url) {
      window.location.href = url;
    }
  } catch (err: any) {
    setError(err.message || 'Erreur lors du paiement');
    setIsSubmitting(false);
  }
};
```

### Étape 2: Modifier `/payment-success.tsx`

Après le paiement Stripe réussi, créer la commande en PHP:

```typescript
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;

  useEffect(() => {
    if (!session_id) return;

    // Vérifier le paiement et créer la commande en PHP
    const finalizeOrder = async () => {
      try {
        // Récupérer les infos de la session Stripe
        // (À implémenter sur l'API si nécessaire)

        // Créer la commande via l'API PHP existante
        const response = await fetch(
          'http://localhost:8000/backend/api/orders/create.php',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              stripe_session_id: session_id,
              shipping_address: '...', // À récupérer
              billing_address: '...',
              payment_method: 'stripe',
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Erreur lors de la création de la commande');
        }

        const result = await response.json();
        // Rediriger vers la confirmation
        router.push(`/order-confirmation/${result.order.id}`);
      } catch (err) {
        console.error('Finalize error:', err);
        setError('Erreur lors de la finalisation');
      }
    };

    finalizeOrder();
  }, [session_id, router]);

  return (
    <div>
      <h1>Finalisation de votre commande...</h1>
    </div>
  );
}
```

---

## 🔐 Sécurité: Mettre à jour l'API PHP

Pour intégrer avec Stripe, l'API PHP doit:

1. **Vérifier la session Stripe** (optionnel mais recommandé)
2. **Créer la commande** avec `stripe_session_id` stockée
3. **Vider le panier** après succès

### Exemple modification `/backend/api/orders/create.php`:

```php
<?php
// Récupérer les données Stripe
$stripe_session_id = $_POST['stripe_session_id'] ?? $_POST['stripe_session_id'];
$payment_method = $_POST['payment_method'] ?? 'card';

// Vérifier que c'est un paiement Stripe
if ($payment_method === 'stripe' && !$stripe_session_id) {
  http_response_code(400);
  echo json_encode(['error' => 'Session Stripe manquante']);
  exit;
}

// Créer la commande avec stripe_session_id
$order = [
  'customer_id' => $customer_id,
  'shipping_address' => $shipping_address,
  'billing_address' => $billing_address,
  'payment_method' => 'stripe',
  'stripe_session_id' => $stripe_session_id, // ← Ajouter
  'status' => 'pending', // Attendre webhook Stripe
];

// INSERT dans la base de données
// ...

// Vider le panier
// ...

echo json_encode(['success' => true, 'order' => $order]);
?>
```

---

## 📊 Flux complet - Intégration Option 2 (Recommandée)

```
1. Utilisateur clique "Finaliser la commande" dans /panier
   ↓
2. Redirection vers /checkout
   ↓
3. /checkout redirige vers /stripe-payment
   ↓
4. /stripe-payment charge le panier et affiche formulaire
   ↓
5. Utilisateur remplit adresse et clique "Procéder au paiement"
   ↓
6. Envoi à /api/stripe-checkout avec données du panier
   ↓
7. Redirection vers Stripe Checkout
   ↓
8. Utilisateur paie
   ↓
9. Redirection vers /payment-success?session_id=...
   ↓
10. /payment-success crée la commande en PHP via webhook/API
    ↓
11. Redirection vers /order-confirmation/{orderId}
    ↓
12. Email de confirmation
```

---

## 🧪 Tester l'intégration

### Test 1: Systèmes parallèles
```
1. Aller à /panier
2. Voir 2 boutons: "Ancien système" et "Test Stripe"
3. Cliquer "Test Stripe"
4. Remplir formulaire
5. Payer avec 4242 4242 4242 4242
6. Voir /payment-success
```

### Test 2: Redirection progressive
```
1. Aller à /panier
2. Cliquer "Finaliser"
3. Automatiquement redirigé vers /stripe-payment
4. Même flux que Test 1
```

### Test 3: Intégration complète
```
1. Paiement Stripe réussi
2. Commande créée en PHP
3. Ordre visible dans /my-orders
4. Email reçu
```

---

## 🚀 Déploiement progressif

### Phase 1: Tests (1-2 semaines)
- [ ] Systèmes parallèles activés
- [ ] Les 2 URL fonctionnent
- [ ] Tests avec carte 4242...
- [ ] Vérifier Dashboard Stripe

### Phase 2: Migration (1-2 semaines)
- [ ] Redirection /checkout → /stripe-payment
- [ ] Tests en production
- [ ] Monitoring des erreurs
- [ ] Support client notifié

### Phase 3: Cleanup
- [ ] Supprimer `/checkout.tsx` (une fois 100% testé)
- [ ] Supprimer formulaire PHP de paiement (si applicable)
- [ ] Garder logs Stripe pour audit

---

## ✅ Checklist d'intégration

- [ ] Stripe JS chargé côté client
- [ ] Variables d'environnement configurées
- [ ] Page `/stripe-payment` affiche le panier correct
- [ ] API `/api/stripe-checkout` crée sessions valides
- [ ] Pages success/cancel fonctionnent
- [ ] Adresses pré-remplies pour utilisateurs authentifiés
- [ ] Panier vidé après paiement réussi
- [ ] Commande créée en base de données (via webhook)
- [ ] Emails de confirmation envoyés
- [ ] Tests avec cartes de test Stripe
- [ ] Dashboard Stripe affiche les bonnes données
- [ ] Documentation mis à jour

---

## 🆘 Support

Si vous avez des questions sur l'intégration:
1. Lire [STRIPE_SETUP.md](./STRIPE_SETUP.md)
2. Consulter [STRIPE_ARCHITECTURE.md](./STRIPE_ARCHITECTURE.md)
3. Vérifier les logs: `npm run dev`
4. Aller sur [Stripe Docs](https://stripe.com/docs)

---

**Prêt à intégrer?** Commencez par **Option 1** (systèmes parallèles) pour tester sans risque! 🚀
