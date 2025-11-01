# Intégration Calendly - ArchiMeuble Frontend

## Vue d'ensemble

Cette intégration permet aux visiteurs du site ArchiMeuble de prendre rendez-vous directement via Calendly pour une consultation gratuite (téléphonique ou visio).

## Fichiers créés/modifiés

### Nouveaux fichiers

1. **`src/components/CalendlyWidget.tsx`**
   - Composant React pour afficher le widget Calendly inline
   - Gestion du loading state
   - Style cohérent avec le design system ArchiMeuble

2. **`.env.local`**
   - Variables d'environnement pour les URLs Calendly
   - `NEXT_PUBLIC_CALENDLY_PHONE_URL` : URL pour les consultations téléphoniques
   - `NEXT_PUBLIC_CALENDLY_VISIO_URL` : URL pour les visioconférences

3. **`install-commands.sh`**
   - Script d'installation des dépendances Calendly

### Fichiers modifiés

1. **`src/components/home/ContactSection.tsx`**
   - Ajout d'un système de tabs (Nous écrire / Prendre RDV)
   - Intégration du widget Calendly
   - Sélecteur de type de consultation (téléphone/visio)

## Installation

### 1. Installer les dépendances

```bash
cd front
npm install react-calendly
```

**Note** : Le package `@types/react-calendly` n'existe pas sur npm. Les types sont inclus dans `react-calendly`.

### 2. Configurer les variables d'environnement

Le fichier `.env.local` a déjà été créé avec les URLs Calendly :

```env
NEXT_PUBLIC_CALENDLY_PHONE_URL=https://calendly.com/benskotlemogo/consultation-telephonique-archimeuble
NEXT_PUBLIC_CALENDLY_VISIO_URL=https://calendly.com/benskotlemogo/30min
```

### 3. Démarrer le serveur de développement

```bash
npm run dev
```

Le site sera accessible sur `http://localhost:3000`

## Test local

1. Accédez à la page d'accueil : `http://localhost:3000`
2. Faites défiler jusqu'à la section Contact
3. Cliquez sur l'onglet "Prendre RDV"
4. Sélectionnez le type de consultation (Téléphone ou Visio)
5. Le widget Calendly doit s'afficher avec le calendrier approprié
6. Testez la prise de rendez-vous (vous pouvez utiliser un email de test)

## Fonctionnalités

### Système de tabs

- **Tab 1 : Nous écrire** - Informations de contact existantes
- **Tab 2 : Prendre RDV** - Widget Calendly pour la prise de rendez-vous

### Types de consultation

1. **Appel téléphonique** (30 min)
   - Consultation par téléphone
   - URL : `NEXT_PUBLIC_CALENDLY_PHONE_URL`

2. **Visioconférence** (45 min)
   - Consultation vidéo interactive
   - URL : `NEXT_PUBLIC_CALENDLY_VISIO_URL`

### Design system

Tous les composants respectent le design system ArchiMeuble :

- **Couleurs** :
  - Primary (ink) : `#2f2a26`
  - Background (alabaster) : `#f6f1eb`
  - Border : `#e0d7cc`

- **Typographie** :
  - Titres : Playfair Display (`.heading-serif`)
  - Corps : Source Sans 3

- **Composants** :
  - Buttons : `rounded-full` avec états actifs/inactifs
  - Cards : `rounded-[32px]` avec bordures et backdrop-blur
  - Transitions : `duration-300` ou `duration-500`

## Structure du code

```tsx
// CalendlyWidget.tsx
export function CalendlyWidget({ url, prefill }: CalendlyWidgetProps) {
  // État de montage pour éviter les erreurs SSR
  const [isMounted, setIsMounted] = useState(false);

  // Loading state pendant le montage
  if (!isMounted) return <LoadingSpinner />;

  // Widget Calendly
  return <InlineWidget url={url} prefill={prefill} />;
}
```

```tsx
// ContactSection.tsx
export function ContactSection() {
  // États pour les tabs et le type de RDV
  const [activeTab, setActiveTab] = useState<"contact" | "appointment">("contact");
  const [appointmentType, setAppointmentType] = useState<"phone" | "visio">("phone");

  // URLs Calendly depuis les variables d'env
  const phoneUrl = process.env.NEXT_PUBLIC_CALENDLY_PHONE_URL || "";
  const visioUrl = process.env.NEXT_PUBLIC_CALENDLY_VISIO_URL || "";

  // Affichage conditionnel selon le tab actif
  return (
    <section>
      {/* Navigation tabs */}
      {activeTab === "contact" && <ContactForm />}
      {activeTab === "appointment" && <CalendlyWidget url={...} />}
    </section>
  );
}
```

## Configuration Calendly (côté Calendly.com)

### Webhooks (optionnel)

Pour recevoir des notifications lorsqu'un rendez-vous est pris :

1. Connectez-vous à Calendly
2. Allez dans **Account** > **Integrations** > **Webhooks**
3. Ajoutez l'URL du webhook backend :
   ```
   https://votre-domaine.com/api/calendly/webhook.php
   ```
4. Sélectionnez les événements : `invitee.created`, `invitee.canceled`

### Questions personnalisées

Pour demander le lien de configuration au client :

1. Éditez votre événement Calendly
2. Allez dans **What event is this?** > **Additional questions**
3. Ajoutez une question :
   - **Question** : "Avez-vous un lien de configuration ArchiMeuble ?"
   - **Type** : Single line text
   - **Required** : Non

## Dépannage

### Le widget ne s'affiche pas

- Vérifiez que les variables d'environnement sont correctement définies
- Vérifiez la console du navigateur pour les erreurs
- Assurez-vous que `react-calendly` est installé

### Erreur SSR (Server-Side Rendering)

Le composant utilise un état `isMounted` pour éviter les erreurs SSR. Si vous rencontrez des problèmes :

```tsx
"use client"; // Assurez-vous que cette directive est en haut du fichier
```

### URLs Calendly incorrectes

Vérifiez dans `.env.local` que les URLs sont correctes et accessibles.

## Prochaines étapes

1. **Tester en production** : Déployer sur Vercel/Netlify et tester avec de vrais rendez-vous
2. **Configurer le webhook backend** : Voir `CALENDLY_README.md` dans le repo backend
3. **Personnaliser les questions Calendly** : Ajouter des champs spécifiques à vos besoins
4. **Analytics** : Suivre les conversions de prise de rendez-vous

## Support

Pour toute question ou problème :
- Consultez la documentation Calendly : https://help.calendly.com/
- Consultez la documentation react-calendly : https://github.com/tcampb/react-calendly

---

**Auteur** : ArchiMeuble Team
**Date** : 31/10/2025
**Version** : 1.0.0
