# ArchiMeuble — Frontend

Application web Next.js pour ArchiMeuble avec configurateur 3D interactif. Le projet utilise **Next.js**, **TypeScript**, **Tailwind CSS** et **Model Viewer** pour l'affichage 3D.

## Prérequis

- Node.js 18 ou plus récent
- npm (ou pnpm/yarn)
- Le backend PHP doit être lancé sur `http://localhost:8000`

## Installation

1. Cloner le repository:
```bash
git clone <votre-repo-front>
cd front
```

2. Installer les dépendances:
```bash
npm install
```

3. Vérifier la configuration API dans `src/lib/apiClient.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8000';
```

## Démarrage du serveur

### Développement (port 3000)

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

### Build de production

```bash
npm run build
npm run start
```

Le serveur Next.js s'exécute en mode production sur le port 3000.

## Pages principales

### Page d'accueil (`/`)
- Affiche la liste des modèles de meubles
- Permet de filtrer par catégorie
- Chaque modèle redirige vers le configurateur

### Configurateur (`/configurator/[id]`)
- Visualisation 3D interactive du meuble
- Personnalisation en temps réel:
  - Nombre de modules (1-5)
  - Hauteur (500-1000mm)
  - Profondeur (240-500mm)
  - Socle (sans/métal/bois)
  - Finition (mat/brillant/bois)
  - Couleur
- Calcul automatique du prix
- Génération du modèle 3D à la volée

### Dashboard Admin (`/admin`)
- Connexion administrateur
- Gestion des modèles (CRUD)
- Upload d'images
- Modification des prompts

## Structure du projet

```
front/
├── public/
│   ├── models/          # Fichiers GLB générés par le backend
│   ├── images/          # Images des modèles
│   └── uploads/         # Images uploadées
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductCard.tsx
│   │   └── admin/
│   │       ├── DashboardModels.tsx
│   │       └── LoginForm.tsx
│   ├── pages/
│   │   ├── index.tsx
│   │   ├── configurator/
│   │   │   └── [id].tsx
│   │   ├── admin/
│   │   │   └── index.tsx
│   │   └── api/
│   │       ├── models.ts
│   │       ├── generate.ts
│   │       └── admin/
│   ├── lib/
│   │   └── apiClient.ts
│   └── styles/
│       └── globals.css
└── package.json
```

## API Client

Le fichier `src/lib/apiClient.ts` centralise toutes les requêtes vers le backend PHP:

```typescript
// Récupérer tous les modèles
const models = await apiClient.models.getAll();

// Générer un modèle 3D
const result = await apiClient.generate.generate(prompt);

// Login admin
await apiClient.admin.login(email, password);
```

## Administration

### Connexion
Accéder à `/admin` et se connecter avec les identifiants stockés dans la base SQLite du backend.

### Gestion des modèles
- Créer un nouveau modèle avec un prompt
- Modifier le nom, description, prix, image
- Supprimer un modèle existant

## Format des prompts

Les prompts utilisent le format du backend:
```
M1(largeur,profondeur,hauteur)MODULES(params)
```

Exemples:
- Scandinave: `M1(1700,500,730)EFH3(F,T,F)`
- Moderne: `M1(2000,400,600)EFH4(T,T,F,F)`
- Compact: `M1(1200,350,650)EFH2(F,T)`

## Calcul des prix

Le configurateur calcule automatiquement le prix selon:
- **Base**: 580€ (incluant EbF)
- **Modules**: +150€ par module
- **Hauteur**: +2€ par cm au-delà de 60cm
- **Profondeur**: +3€ par cm
- **Finition**:
  - Mat: +0€
  - Brillant: +60€
  - Bois: +100€
- **Socle**:
  - Sans: +0€
  - Métal: +40€
  - Bois: +60€

## Visualisation 3D

Le projet utilise [Model Viewer](https://modelviewer.dev/) pour afficher les fichiers GLB:
- Rotation automatique
- Contrôles caméra (zoom, rotation)
- Ombres et éclairage réaliste
- Chargement progressif

## Notes importantes

- Le frontend et le backend sont dans des repositories séparés
- Les fichiers GLB sont générés par le backend dans `front/public/models/`
- Assurez-vous que les deux repositories sont au même niveau:
  ```
  archimeuble/
  ├── back/    (backend PHP)
  └── front/   (ce repository)
  ```

## Dépannage

### Erreur "Failed to fetch models"
Vérifier que le backend PHP est lancé sur `http://localhost:8000`

### CORS errors
Vérifier la configuration CORS dans le backend PHP

### Modèle 3D ne s'affiche pas
- Vérifier que le fichier GLB existe dans `public/models/`
- Vérifier que le chemin retourné par l'API est correct (`/models/filename.glb`)
- Ouvrir la console pour voir les erreurs Model Viewer

### Admin non connecté
- Vérifier que la session backend est active
- Vérifier les cookies dans le navigateur (domaine `localhost`)

## Tests

```bash
# Tester que le frontend peut contacter le backend
curl http://localhost:8000/api/models

# Vérifier qu'un modèle 3D est accessible
curl http://localhost:3000/models/meuble_example.glb
```
