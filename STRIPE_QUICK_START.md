# Stripe - Quick Start Guide 🚀

## ⚡ 5 minutes pour commencer

### 1️⃣ Copier les variables d'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env.local
```

Les clés Stripe sont déjà dans le fichier. ✅

### 2️⃣ Vérifier l'installation

```bash
npm list stripe @stripe/stripe-js
```

Les packages sont déjà installés. ✅

### 3️⃣ Lancer le serveur

```bash
npm run dev
```

Aller à `http://localhost:3000`

### 4️⃣ Tester la page de paiement

Accéder à: **`http://localhost:3000/stripe-payment`**

Vous devriez voir:
- Un formulaire d'adresse
- Un résumé de commande (simulé: 5€ + 4€ livraison)
- Un bouton "Procéder au paiement"

### 5️⃣ Tester un paiement

1. Remplir le formulaire d'adresse
2. Cliquer "Procéder au paiement"
3. Utiliser la carte Stripe de test: **`4242 4242 4242 4242`**
4. Date future (ex: `12/25`)
5. CVC: Tout 3 chiffres (ex: `123`)
6. Code postal: Tout code (ex: `12345`)
7. Cliquer "Payer"

Vous serez redirigé vers `/payment-success` ✅

---

## 🎯 Utiliser vos propres données de commande

### Option A: Via sessionStorage (Rapide)

**Depuis votre page panier (`panier.tsx`):**

```typescript
import { useRouter } from 'next/router';

export default function CartPage() {
  const router = useRouter();

  const handleCheckout = () => {
    // Stocker les données du panier
    sessionStorage.setItem('stripe_checkout_cart', JSON.stringify({
      items: [
        { name: 'Meuble 1', price: 150, quantity: 1 },
        { name: 'Meuble 2', price: 200, quantity: 2 },
        { name: 'Livraison', price: 25, quantity: 1 },
      ],
      total: 575,
    }));

    // Rediriger vers le paiement
    router.push('/stripe-payment');
  };

  return <button onClick={handleCheckout}>Payer maintenant</button>;
}
```

Voilà ! La page de paiement affichera vos données. ✅

### Option B: Via API (Recommandé)

Créer une API `/api/cart` qui retourne:
```json
{
  "items": [
    { "name": "Produit 1", "price": 100, "quantity": 1 }
  ],
  "total": 100
}
```

Puis dans `stripe-payment.tsx`, décommenter et adapter le code d'exemple fourni.

---

## 📋 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `src/pages/stripe-payment.tsx` | **Page principale** - formulaire + paiement |
| `src/pages/payment-success.tsx` | Page après paiement réussi |
| `src/pages/payment-cancel.tsx` | Page si paiement annulé |
| `src/pages/api/stripe-checkout.ts` | **API** - crée session Stripe |
| `src/lib/stripe-utils.ts` | Utilitaires réutilisables |
| `.env.example` | Variables d'environnement |
| `STRIPE_SETUP.md` | Documentation complète |
| `STRIPE_ARCHITECTURE.md` | Diagrammes et architecture |

---

## 🔗 Chemins d'accès

```
/stripe-payment          → Page de paiement (formulaire + résumé)
/api/stripe-checkout     → API créant session Stripe
/payment-success         → Page de confirmation
/payment-cancel          → Page d'annulation
```

---

## 🧪 Tester sur Stripe Dashboard

1. Aller à: [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Section "Payments"
3. Vous devriez voir les paiements de test
4. Cliquer sur une session pour voir:
   - Montant total
   - Adresse du client
   - Liste des articles
   - Métadonnées

---

## ❓ FAQ

**Q: Où stocker les clés Stripe?**
A: Dans `.env.local` (JAMAIS dans le code). Les clés sont déjà prêtes.

**Q: Le paiement est-il vraiment sécurisé?**
A: Oui! Stripe est PCI Level 1. Votre serveur ne voit jamais les numéros de carte.

**Q: Comment intégrer avec ma base de données?**
A: Voir `STRIPE_SETUP.md` section "Webhooks" pour les confirmations automatiques.

**Q: Puis-je changer les pays autorisés?**
A: Oui, dans `src/pages/api/stripe-checkout.ts` ligne ~70.

**Q: Comment tester sans payer?**
A: Utiliser les cartes de test Stripe (liste dans "Tester un paiement" ci-dessus).

---

## 🆘 Erreurs courantes

| Erreur | Solution |
|--------|----------|
| "Invalid API key" | Vérifier `.env.local` |
| "Page not found /stripe-payment" | Vérifier le fichier existe: `src/pages/stripe-payment.tsx` |
| "STRIPE_SECRET_KEY is undefined" | Redémarrer `npm run dev` |
| Panier vide sur la page | Lire "Utiliser vos propres données" ci-dessus |

---

## 📖 Documentations

- **Quick Start** 👈 Vous êtes ici
- **[STRIPE_SETUP.md](./STRIPE_SETUP.md)** - Guide complet
- **[STRIPE_ARCHITECTURE.md](./STRIPE_ARCHITECTURE.md)** - Diagrammes

---

## ✅ Checklist du déploiement

Avant de mettre en production:

- [ ] `.env.local` a les vraies clés Stripe (pas de test)
- [ ] Domain de redirection configuré dans Stripe Dashboard
- [ ] Webhooks Stripe configurés (optionnel mais recommandé)
- [ ] Email de confirmation envoyés au client
- [ ] Données de paiement sauvegardées en base de données
- [ ] Tests avec vraies cartes (si autorisé)
- [ ] HTTPS activé sur votre domaine

---

## 🚀 Prêt à commencer?

```bash
npm run dev
# Aller à http://localhost:3000/stripe-payment
```

Bonne chance! 🎉

---

**Besoin d'aide?**
- Lire [STRIPE_SETUP.md](./STRIPE_SETUP.md)
- Consulter [Stripe Docs](https://stripe.com/docs)
- Vérifier les logs du serveur: `npm run dev`

