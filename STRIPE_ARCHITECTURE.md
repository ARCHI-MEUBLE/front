# Architecture Stripe - Diagrammes et Guide

## 🏗️ Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐        ┌──────────────────────────┐  │
│  │  stripe-payment.tsx  │        │  /api/stripe-checkout    │  │
│  │                      │───────▶│  (Créer session Stripe)  │  │
│  │  • Formulaire        │        │                          │  │
│  │  • Adresse           │        │  • Valide données        │  │
│  │  • Résumé commande   │        │  • Crée session          │  │
│  │  • Bouton paiement   │◀───────│  • Retourne sessionId    │  │
│  └──────────────────────┘        └──────────────────────────┘  │
│           │                                   │                 │
│           │ Envoie données                    │ Utilise         │
│           │ commande + adresse                │ STRIPE_SECRET   │
│           │                                   │                 │
│           └───────────────────────────────────┘                 │
│                                                                 │
│  ┌──────────────────┐                                           │
│  │ payment-success  │  ◀──────── Redirection après paiement    │
│  │ payment-cancel   │                                           │
│  └──────────────────┘                                           │
│                                                                 │
│  ┌──────────────────┐                                           │
│  │  stripe-utils.ts │  (Utilitaires réutilisables)             │
│  │  • Validation    │                                           │
│  │  • Formatage     │                                           │
│  │  • Calculs       │                                           │
│  └──────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Stripe Checkout                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • Formulaire de paiement sécurisé                             │
│  • Collecte adresse de livraison                               │
│  • Accepte carte bancaire                                       │
│  • 3D Secure, etc.                                              │
│                                                                 │
│  Métadonnées reçues par Stripe:                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ - Items (nom, prix, quantité)                            │  │
│  │ - Adresse de livraison (nom, adresse, ville, CP, pays)   │  │
│  │ - Montant total                                           │  │
│  │ - Client ID, Order ID (métadonnées)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Flux de données - Paiement réussi

```
1. Utilisateur arrive sur /stripe-payment
   ├─ Voir résumé de commande (simulé ou du panier)
   └─ Voir formulaire d'adresse (France, Belgique, Lux, Suisse)

2. Utilisateur remplit formulaire et clique "Procéder au paiement"
   ├─ fullName: "Jean Dupont"
   ├─ address: "123 Rue Example"
   ├─ postalCode: "75001"
   ├─ city: "Paris"
   └─ country: "France"

3. Frontend envoie à /api/stripe-checkout
   │
   ├─ POST /api/stripe-checkout
   │  Body:
   │  {
   │    items: [
   │      { name: "Produit 1", price: 500, quantity: 1 },    // 5€
   │      { name: "Livraison", price: 400, quantity: 1 }      // 4€
   │    ],
   │    shippingAddress: { ... },
   │    customerId: "user_123",
   │    orderId: "order_456"
   │  }
   │
   └─ API crée session Stripe
      ├─ Valide les données
      ├─ Configure shipping_address_collection
      ├─ Crée line_items avec prix en centimes
      ├─ Ajoute métadonnées (customerId, orderId)
      └─ Retourne { sessionId, url }

4. Frontend redirige vers Stripe Checkout
   │
   ├─ window.location.href = url
   │  OU
   └─ stripe.redirectToCheckout({ sessionId })

5. Utilisateur sur interface Stripe
   ├─ Voir le résumé (articles + montant)
   ├─ Voir l'adresse de livraison
   ├─ Remplir infos de paiement
   └─ Valider le paiement

6. Stripe traite et valide le paiement
   ├─ Charge la carte
   ├─ Enregistre la transaction
   ├─ Dashboard Stripe affiche:
   │  ├─ Customer: "Jean Dupont"
   │  ├─ Address: "123 Rue Example, 75001 Paris, France"
   │  ├─ Items: [Produit 1, Livraison]
   │  ├─ Amount: 9€
   │  └─ Status: Succeeded
   └─ Génère sessionId = "cs_test_..."

7. Redirection vers /payment-success?session_id=cs_test_...
   ├─ Affiche message "Paiement réussi"
   ├─ Affiche session ID pour vérification
   ├─ Boutons: "Mes commandes", "Retour accueil"
   └─ Email de confirmation envoyé

8. Utilisateur voit la page de succès
   └─ Peut suivre sa commande via /my-orders
```

---

## ❌ Flux de données - Paiement annulé

```
1. Utilisateur lance le paiement
   └─ Redirection vers Stripe Checkout

2. Utilisateur clique sur "< Retour" ou ferme
   └─ Redirection vers /payment-cancel

3. Page de cancellation affiche:
   ├─ Message "Paiement annulé"
   ├─ "Aucun montant n'a été prélevé"
   ├─ Options:
   │  ├─ "Retourner au panier"
   │  └─ "Continuer le shopping"
   └─ Panier conservé
```

---

## 🔐 Sécurité - Où vont les données

```
┌─────────────────────────────────────────────────────────────────┐
│                        SERVEUR FRONTEND                         │
│                     (Next.js / Node.js)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ SÛRS - Clés secrètes stockées ici:                          │
│  ├─ STRIPE_SECRET_KEY                                           │
│  └─ Variables d'environnement .env.local (JAMAIS en git)        │
│                                                                 │
│  ⚠️  JAMAIS exposer au client:                                  │
│  └─ sessionId doit être créé côté serveur SEULEMENT            │
│                                                                 │
│  ✅ Bonnes pratiques:                                           │
│  ├─ Valider données reçues du frontend                         │
│  ├─ Vérifier montants (fraude)                                 │
│  └─ Logger les transactions                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NAVIGATEUR UTILISATEUR                      │
│                      (Client-side React)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ SÛRS - Clé publique stockée ici:                            │
│  └─ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY                          │
│     (Préfixe NEXT_PUBLIC = exposée au client)                   │
│                                                                 │
│  ❌ JAMAIS stocker ici:                                         │
│  ├─ STRIPE_SECRET_KEY                                           │
│  ├─ Numéros de carte                                            │
│  ├─ CVC / CVV                                                   │
│  └─ Autres infos sensibles                                      │
│                                                                 │
│  ✅ Données envoyées au paiement:                               │
│  └─ formulaire → /api/stripe-checkout → Stripe                │
│     Stripe gère la sécurité du formulaire de paiement           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STRIPE (PCI Level 1)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Les données bancaires ne quittent JAMAIS le navigateur     │
│  ✅ Stripe gère le chiffrement et la sécurité                   │
│  ✅ Votre serveur ne voit JAMAIS les numéros de carte          │
│  ✅ Conforme aux standards PCI-DSS                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Structure des fichiers

```
frontend/
├── src/
│   ├── pages/
│   │   ├── stripe-payment.tsx
│   │   │   └─ Page de paiement universelle
│   │   │      • Formulaire adresse
│   │   │      • Résumé commande
│   │   │      • Bouton paiement
│   │   │      • Intégration Stripe côté client
│   │   │
│   │   ├── payment-success.tsx
│   │   │   └─ Page après paiement réussi
│   │   │      • Message de confirmation
│   │   │      • Session ID
│   │   │      • Liens actions
│   │   │
│   │   ├── payment-cancel.tsx
│   │   │   └─ Page après annulation
│   │   │      • Message information
│   │   │      • Conseils
│   │   │      • Options alternatives
│   │   │
│   │   ├── stripe-payment-with-cart.example.tsx
│   │   │   └─ EXEMPLE: Intégration avec votre panier
│   │   │      • À adapter selon votre système
│   │   │      • À supprimer une fois intégré
│   │   │
│   │   └── api/
│   │       └── stripe-checkout.ts
│   │           └─ API serveur Stripe
│   │              • Reçoit données commande
│   │              • Crée session Stripe
│   │              • Retourne sessionId
│   │              • Gère les erreurs
│   │
│   ├── lib/
│   │   └── stripe-utils.ts
│   │       └─ Utilitaires Stripe
│   │          • Validation adresse
│   │          • Validation articles
│   │          • Calcul total
│   │          • Format prix
│   │          • Liste pays
│   │          • Formeurs helpers
│   │
│   └── ...
│
├── .env.example
│   └─ Variables d'environnement (copier en .env.local)
│
├── STRIPE_SETUP.md
│   └─ Documentation complète (ce que tu lis)
│
└── STRIPE_ARCHITECTURE.md
    └─ Diagrammes et architecture (ce fichier)
```

---

## 🔄 Intégration avec le panier existant

### Approche 1: Via SessionStorage (Recommandée pour MVP)

**Depuis panier.tsx:**
```typescript
const handleCheckout = () => {
  // Stocker les données du panier
  sessionStorage.setItem('stripe_checkout_cart', JSON.stringify({
    items: cart.items,
    total: cart.total,
  }));
  // Rediriger
  router.push('/stripe-payment');
};
```

**Dans stripe-payment.tsx:**
```typescript
useEffect(() => {
  const cartData = sessionStorage.getItem('stripe_checkout_cart');
  if (cartData) {
    setOrder(JSON.parse(cartData));
    sessionStorage.removeItem('stripe_checkout_cart');
  }
}, []);
```

### Approche 2: Via Context React (Recommandée pour production)

**CartContext.tsx:**
```typescript
const CartContext = React.createContext(...);

export const CartProvider = ({ children }) => (
  <CartContext.Provider value={{ cart, setCart }}>
    {children}
  </CartContext.Provider>
);
```

**Dans stripe-payment.tsx:**
```typescript
const { cart } = useContext(CartContext);

useEffect(() => {
  if (cart) {
    setOrder({ items: cart.items, total: cart.total });
  }
}, [cart]);
```

### Approche 3: Via API Backend (Recommandée si serveur Node.js)

```typescript
const loadCart = async () => {
  const response = await fetch('/api/cart', {
    credentials: 'include', // Envoyer les cookies
  });
  const cartData = await response.json();
  setOrder({ items: cartData.items, total: cartData.total });
};
```

---

## 💰 Exemple: Montants et conversion

```
Frontend (euros):
┌────────────┬─────────┬──────────┐
│ Produit    │ Prix    │ Quantité │
├────────────┼─────────┼──────────┤
│ Produit A  │ 15€     │ 2        │ = 30€
│ Produit B  │ 25€     │ 1        │ = 25€
│ Livraison  │ 5€      │ 1        │ = 5€
├────────────┼─────────┼──────────┤
│ TOTAL      │         │          │ = 60€
└────────────┴─────────┴──────────┘

Conversion pour Stripe (centimes):
┌────────────┬──────────────┬──────────┐
│ Produit    │ Prix (cents) │ Quantité │
├────────────┼──────────────┼──────────┤
│ Produit A  │ 1500         │ 2        │ = 3000¢
│ Produit B  │ 2500         │ 1        │ = 2500¢
│ Livraison  │ 500          │ 1        │ = 500¢
├────────────┼──────────────┼──────────┤
│ TOTAL      │              │          │ = 6000¢ = 60€
└────────────┴──────────────┴──────────┘

Code:
// Frontend (en euros)
const items = [
  { name: "Produit A", price: 15, quantity: 2 },
  { name: "Produit B", price: 25, quantity: 1 },
  { name: "Livraison", price: 5, quantity: 1 },
];

// Conversion avant envoi à l'API
const checkoutData = {
  items: items.map(item => ({
    ...item,
    price: Math.round(item.price * 100), // ← Convertir en centimes
  })),
};
```

---

## 🧪 Test avec Stripe

### Cartes de test
```
Numéro     │ Résultat
───────────┼───────────────────────
4242...    │ Succès
4000...    │ Refusée
5555...    │ Mastercard test
3782...    │ Amex test
3714...    │ Amex test

Pour toutes les cartes:
- Date: Toute date future (ex: 12/25)
- CVC: Tout 3 chiffres (ex: 123)
- Postal: Tout code (ex: 12345)
```

### Dashboard Stripe - Où voir les données
```
1. Aller à: https://dashboard.stripe.com
2. Section "Payments"
3. Cliquer sur une session complétée
4. Voir:
   ├─ Montant (ex: 60€)
   ├─ Client (adresse)
   ├─ Items (produits)
   ├─ Metadata (customerId, orderId)
   └─ Status (succeeded, failed, etc.)
```

---

## 🐛 Debugging

### Logs côté serveur
```
// Dans /api/stripe-checkout.ts
console.log('Checkout request:', req.body);
console.log('Creating session...');
console.log('Session created:', session.id);
console.log('Redirect URL:', session.url);
```

### Logs côté client
```typescript
// Dans stripe-payment.tsx
console.log('Form submitted with:', formData);
console.log('Sending to API:', checkoutData);
console.log('Session response:', { sessionId, url });
```

### Vérifier les variables d'environnement
```bash
# Depuis le terminal, voir si les variables sont chargées
echo $NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
echo $STRIPE_SECRET_KEY
```

---

## 📈 Prochaines étapes

### Phase 1 (Actuelle)
- ✅ Page de paiement basique
- ✅ API de création de session
- ✅ Pages de succès/annulation
- ✅ Pages d'exemple

### Phase 2 (À faire)
- 🔲 Webhooks Stripe pour confirmations automatiques
- 🔲 Sauvegarde de la session en base de données
- 🔲 Email de confirmation
- 🔲 Système de factures/reçus
- 🔲 Affichage du statut de paiement

### Phase 3 (À faire)
- 🔲 Remboursements
- 🔲 Paiements partiels
- 🔲 Abonnements Stripe
- 🔲 Intégration avec les commandes existantes

---

## 📚 Ressources

- [Documentation Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [API Stripe Node.js](https://stripe.com/docs/api)
- [Cartes de test](https://stripe.com/docs/testing)
- [PCI Compliance](https://stripe.com/docs/security)

---

**Dernière mise à jour:** Novembre 2025
**Version:** 1.0
