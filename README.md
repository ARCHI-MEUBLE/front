# ArchiMeuble — Frontend

Site de [ArchiMeuble](https://www.archimeuble.com), menuisier à Lille : vitrine, configurateur 3D de meubles sur mesure,
réalité augmentée (« Voir chez moi »), boutique, échantillons, demandes de devis, paiement et espace d'administration.

Ce dépôt ne contient que le **frontend** (Next.js). Les données, les prix, les paiements et la génération des
fichiers 3D et de fabrication sont dans le dépôt **backend** (`back/` : PHP, PostgreSQL et générateur Python), qui
tourne sous Docker.

## Sommaire

- [Stack](#stack)
- [Installation en local](#installation-en-local)
- [Scripts](#scripts)
- [Pages](#pages)
- [Configurateur](#configurateur)
- [Format des prompts](#format-des-prompts)
- [Visualisation 3D et fichiers générés](#visualisation-3d-et-fichiers-générés)
- [Communication avec le backend](#communication-avec-le-backend)
- [Administration](#administration)
- [Référencement](#référencement)
- [Organisation du code](#organisation-du-code)
- [Branches et déploiement](#branches-et-déploiement)
- [Tests](#tests)
- [Dépannage](#dépannage)

## Stack

| | |
|---|---|
| Framework | Next.js 16 (Pages Router, Turbopack), React 19, TypeScript |
| Styles | Tailwind CSS 4 — couleurs et typographie (Geist, Geist Mono) dans `styles/globals.css` |
| 3D | Three.js, React Three Fiber et Drei pour le configurateur ; `<model-viewer>` sur certaines pages |
| Paiement | Stripe |
| Tests | Vitest |
| Hébergement | Vercel (région Paris, `cdg1`) |

## Installation en local

Prérequis : **Node.js 20.9 ou plus récent** et **Docker** (pour le backend).

### Les deux dépôts côte à côte

Le frontend et le backend sont dans des dépôts séparés, qui doivent être dans le même dossier : le backend monte
`../front/public/models` pour y écrire les fichiers 3D qu'il génère.

```
archimeuble/
├── back/    (backend PHP)
└── front/   (ce dépôt)
```

### 1. Lancer le backend

```bash
cd back
docker compose up -d
```

Il démarre trois conteneurs :

| Conteneur | Adresse | Rôle |
|---|---|---|
| `archimeuble-backend` | http://localhost:8000 | API PHP et générateur 3D Python |
| `archimeuble-postgres` | port 5432 | Base de données PostgreSQL |
| `archimeuble-adminer` | http://localhost:8080 | Interface web de la base |

Le code du backend est monté dans le conteneur : ses dépendances PHP (`back/vendor/`) doivent être installées.
En cas de doute, ou si l'API répond par une erreur PHP, lancez :

```bash
docker exec archimeuble-backend composer install
```

### 2. Lancer le frontend

```bash
cd front
npm install
cp .env.example .env.local   # puis compléter les valeurs (voir ci-dessous)
npm run dev
```

Le site est sur http://localhost:3000.

### Variables d'environnement

À mettre dans `.env.local`, qui n'est jamais commité. Sur Vercel, elles se règlent dans les paramètres du projet.

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_URL` | Adresse du backend PHP (`http://localhost:8000` en local) |
| `BACKEND_URL` | Adresse du backend pour le serveur Next seulement, si `NEXT_PUBLIC_API_URL` est vide |
| `NEXT_PUBLIC_ADMIN_PATH` | Chemin de l'administration (voir [Administration](#administration)) — **indispensable pour y accéder** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe (`pk_test_…` en local) |
| `NEXT_PUBLIC_SITE_URL` | Adresse canonique du site pour le référencement (par défaut `https://www.archimeuble.com`) |
| `SESSION_SECRET` | Optionnel |

Les variables `NEXT_PUBLIC_*` sont copiées dans le code envoyé aux navigateurs : n'y mettez jamais de secret.
Les autres réglages (clé secrète Stripe, e-mails Resend, Calendly, Crisp…) sont dans `back/.env`.

## Scripts

| Commande | |
|---|---|
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` puis `npm run start` | Version de production en local (port 3000) |
| `npm test` | Tests (Vitest) |
| `npm run test:watch` | Tests relancés à chaque modification |
| `npm run lint` | ESLint |

## Pages

| Adresse | Page |
|---|---|
| `/` | Accueil |
| `/models` | Modèles de meubles, par catégorie ; chaque modèle ouvre le configurateur |
| `/configurator/[id]` | Configurateur 3D d'un modèle (voir [Configurateur](#configurateur)) |
| `/ar` | Ouverture en réalité augmentée sur téléphone, depuis le QR code du configurateur |
| `/realisations` | Réalisations de l'atelier, gérées dans l'administration |
| `/catalogue`, `/catalogue/[id]` | Boutique (quincaillerie, accessoires) |
| `/samples` | Commande d'échantillons de matériaux |
| `/demande-devis` | Demande de devis (avec pièces jointes) |
| `/contact-request` | Formulaire de contact |
| `/avis` | Avis clients et formulaire pour en laisser un |
| `/cart`, `/checkout` | Panier et commande |
| `/paiement/[token]` | Paiement d'un lien envoyé par l'atelier (Stripe) |
| `/order-confirmation/[orderId]` | Confirmation de commande |
| `/mentions-legales`, `/confidentialite` | Pages légales |
| `/sitemap.xml` | Plan du site pour Google (voir [Référencement](#référencement)) |

`/facades` (configurateur de façades seules) existe mais n'est liée depuis aucune page.

## Configurateur

`src/pages/configurator/[id].tsx`, en 5 étapes : **Dimensions**, **Division**, **Portes**, **Matières**, **Finitions**
(définies dans `src/components/configurator/steps/steps.ts`).

### Le meuble : un arbre de zones

Le meuble est un arbre de **zones** (`src/components/configurator/ZoneEditor/types.ts`) :

- une zone `leaf` est un compartiment : vide, tiroir, penderie, porte…
- une zone `vertical` est divisée en colonnes, une zone `horizontal` en étagères ;
- les proportions des parties sont dans `splitRatio` (2 parties) ou `splitRatios` (3 et plus), en pourcentages ;
- une porte peut couvrir un compartiment (`content`) ou tout un groupe de zones (`doorContent`).

Les opérations sur cet arbre (diviser, redimensionner, poser une façade, sélectionner, supprimer) sont dans
`src/lib/configurator/`, chacune avec ses tests. Les modifications de l'arbre de zones passent par `useHistory`
(`src/hooks/useHistory.ts`) : annuler / rétablir avec les boutons ou Ctrl+Z / Ctrl+Y. Les dimensions du meuble
n'y sont pas.

### Limites de fabrication

`src/lib/configurator/constraints.ts` regroupe toutes les limites physiques (en mm), réglables à un seul endroit :

| Limite | Valeur |
|---|---|
| Largeur du meuble | 30 cm à 2,8 m (longueur d'une plaque) |
| Hauteur (pieds compris) | 30 cm à 2,2 m |
| Profondeur | 20 à 80 cm |
| Colonne / casier | au moins 20 cm de large / 10 cm de haut |
| Étagère | 1 m de portée au plus |
| Porte (un vantail) | 15 à 60 cm |
| Tiroir | 20 cm à 1,2 m de large, 25 cm de profondeur au moins |
| Penderie | 80 cm de haut et 50 cm de profondeur au moins, 1,2 m de large au plus |

Les options impossibles sont désactivées avec leur raison. Un meuble hors limites (session ancienne, meuble réduit
après coup…) est signalé, et n'est ni généré ni enregistré tant qu'il n'est pas corrigé.

### Bouton « Corriger »

`src/lib/configurator/constraintFix.ts` rend un meuble hors limites fabricable en gardant ce qui a été dessiné :

| Problème | Correction |
|---|---|
| Trop large pour des tiroirs, une double porte, des étagères ou une penderie | Partagé en colonnes identiques (une pile de tiroirs de 1,38 m devient deux piles de 69 cm) |
| Porte simple de plus de 60 cm | Double porte |
| Porte vitrée ou push trop large | Deux portes, ouvrant l'une à gauche, l'autre à droite |
| Double porte trop étroite | Porte simple |
| Compartiments trop petits | Remis à égalité, ou moins nombreux si cela ne suffit pas |
| Dimension hors limites | Ramenée à la limite |
| Impossible à sauver (tiroir trop étroit ou trop peu profond, penderie trop basse…) | Retiré, et signalé |

La correction s'annule comme toute modification. Ce qui ne peut pas être corrigé seul ouvre l'étape concernée.

### Prix

Le prix est **estimé par le backend** (`/backend/api/pricing/estimate.php`) à chaque modification et affiché en
fourchette (prix ± écart type, détail par poste). Le frontend ne calcule rien (`src/lib/pricing.ts` ne fait
qu'afficher) : le backend recalcule le prix à l'enregistrement. Les tarifs se règlent dans l'administration
(« Gestion des prix »).

### Partage et enregistrement

- **Partager** crée un lien `/configurator/[id]?partage=<code>` qui rouvre le meuble tel qu'il était.
- **Valider** enregistre la configuration du client (elle apparaît dans « Configurations clients » de l'admin).

### Réalité augmentée (« Voir chez moi »)

Le meuble est exporté depuis la scène 3D du configurateur (portes fermées, couleurs et textures comprises), pas depuis
le modèle du générateur Python (`src/lib/ar/`).

- **iPhone / iPad** : AR Quick Look, avec un fichier USDZ créé dans le navigateur.
- **Android** : Scene Viewer, avec un fichier GLB déposé sur le backend. Il ne fonctionne qu'en **https**, donc pas
  depuis `localhost`.
- **Ordinateur** : un QR code ouvre la page `/ar` sur le téléphone.

## Format des prompts

Le backend décrit un meuble par un **prompt**, une chaîne de caractères que lit le générateur Python
(`back/python/procedure_real.py`). Le configurateur la construit à partir de l'arbre de zones
(`buildPromptFromZoneTree`) et sait la relire (`parsePromptToConfig`) : c'est elle qui est enregistrée avec chaque
modèle et chaque configuration.

```
M1(largeur,profondeur,hauteur)EbF[S|S2]<zones>
```

| Code | Signification |
|---|---|
| `M1(1500,500,730)` | Création du meuble : largeur, profondeur, hauteur en mm |
| `E` | Enveloppe extérieure du meuble |
| `b` | Planche du bas |
| `F` | Planche de fond |
| `S` / `S2` | Socle métal / socle bois (rien : sans socle) |
| `V3(…)`, `H3(…)` | 3 colonnes (`V`) ou 3 étagères (`H`) de taille égale |
| `V[30,70](…)` | Colonnes en proportions (pourcentages) |
| `HI…`, `VI…` | Séparations invisibles : pas de planche entre les parties (piles de tiroirs) |
| `T`, `To` | Tiroir, tiroir push |
| `D` | Penderie |
| `c` | Passe-câble |
| `Pg`, `Pd`, `P2` | Porte ouvrant à gauche, à droite, double porte |
| `Pm`, `Po` | Porte vitrée, porte push |
| `1` à `4` après une porte ou un tiroir | Poignée : barre verticale, barre horizontale, bouton, encastrée |
| `P2(H2(,))` | Porte posée sur tout un groupe de zones |

Dans un groupe, les parties sont séparées par des virgules ; une partie vide est un compartiment vide. Les étagères
(`H`) sont écrites **du bas vers le haut**, les colonnes (`V`) de gauche à droite.

Exemple : `M1(1000,400,2000)EbFSV[33,33,34](,T,H2(,D))` — meuble de 1 m × 40 cm × 2 m sur socle métal, en trois
colonnes : la première vide, la deuxième avec un tiroir, la troisième en deux étagères avec une penderie en haut.

## Visualisation 3D et fichiers générés

- **Configurateur** : la 3D est calculée dans le navigateur avec React Three Fiber (`src/components/configurator/`),
  à partir de l'arbre de zones. Elle se met à jour instantanément, sans passer par le backend.
- **Génération** : le prompt est aussi envoyé au générateur du backend (`apiClient.generate` →
  `/api/generate` → `generate.php`), qui produit le fichier 3D **GLB** et le fichier de découpe **DXF** pour
  l'atelier. Les GLB sont écrits dans `public/models/` (dossier monté par Docker) et servis à l'adresse `/models/…`.
- **`<model-viewer>`** n'est chargé que sur les pages qui le déclarent (`needsModelViewer`, voir `src/pages/_app.tsx`),
  comme le panier.

## Communication avec le backend

Trois façons d'appeler le backend, selon l'endroit :

1. **Depuis le navigateur**, avec `src/lib/apiClient.ts`, qui centralise les appels :

   ```typescript
   import { apiClient } from '@/lib/apiClient';

   const models = await apiClient.models.getAll();            // modèles de meubles
   const model = await apiClient.models.getById(3);
   const categories = await apiClient.categories.getAll(true); // catégories actives
   const result = await apiClient.generate.generate(prompt);   // GLB et DXF
   ```

   Groupes disponibles : `adminAuth`, `categories`, `models`, `configurations`, `generate`, `samples`, `arModels`.
   En cas d'erreur (backend en panne, réponse sans données), les fonctions lèvent une erreur : à intercepter.

2. **Par les routes API de Next** (`src/pages/api/`) : elles relaient les requêtes vers le backend en gardant les
   cookies de session. `/backend/api/*` est réécrit vers `/api/proxy/*` (voir `next.config.js`), qui relaie tout
   fichier PHP du backend, envois de fichiers compris.

3. **Depuis le serveur Next** (pages rendues côté serveur, plan du site), avec `src/lib/backendServer.ts`.

Les images envoyées (`/uploads/…`), les modèles 3D (`/models/…`) et les textures (`/textures/…`) sont aussi relayés
vers le backend (`next.config.js`).

## Administration

### Accès

L'administration n'est pas à `/admin` : cette adresse renvoie volontairement une 404. Elle est servie sous le chemin
défini par `NEXT_PUBLIC_ADMIN_PATH` (par exemple `http://localhost:3000/mon-chemin/login`), réécrit vers les pages
`src/pages/admin/` par `src/proxy.ts`. **Sans cette variable, l'administration est inaccessible.**

Les comptes administrateurs et la session sont gérés par le backend (PostgreSQL), avec un cookie de session.

### Sections

| Section | Contenu |
|---|---|
| Modèles de meubles | Créer, modifier, supprimer les modèles et leurs catégories |
| Catalogue & Pièces | Articles de la boutique et leurs variantes |
| Façades | Façades vendues seules |
| Configurations clients | Meubles enregistrés par les clients ; création d'une commande depuis une configuration |
| Gestion des commandes, Paiements | Commandes, liens de paiement Stripe, transactions |
| Demandes clients | Demandes de devis et de contact |
| Demandes de RDV, Calendrier | Rendez-vous (Calendly) |
| Gestion des prix | Tarifs utilisés par l'estimation du configurateur |
| Échantillons | Échantillons proposés et statistiques |
| Avis clients | Modération des avis |
| Réalisations | Projets de la page Réalisations, avec leurs photos |
| Paramètres | Mot de passe, modèles d'e-mails |

### Créer ou modifier un modèle

Un modèle se dessine **dans le configurateur**, ouvert depuis « Modèles de meubles » en mode administration
(`?adminMode=createModel` ou `?adminMode=editModel`). On y règle le meuble comme un client, puis on l'enregistre comme
modèle avec son nom, sa description, sa catégorie et ses images. Son prompt est enregistré avec lui.

## Référencement

- Chaque page publique déclare son titre, sa description et son aperçu de partage avec le composant
  `src/components/Seo.tsx`. Les données lues par Google (entreprise, FAQ, produits, fil d'Ariane) sont dans
  `src/lib/seo.ts`, à tenir à jour avec le pied de page et les mentions légales.
- `/sitemap.xml` est généré à la demande à partir des modèles et des articles du backend ; `public/robots.txt`
  le déclare et écarte le panier et le paiement.
- Les pages du configurateur, des articles et des réalisations sont rendues par le serveur : Google et les aperçus
  de liens (WhatsApp, Facebook…) reçoivent la page complète. Si le backend ne répond pas en 4 secondes, elles se
  chargent dans le navigateur. Un modèle ou un article supprimé renvoie une vraie 404.

## Organisation du code

```
front/
├── public/              images, textures, robots.txt ; models/ reçoit les GLB du backend
├── styles/globals.css   couleurs, typographie et styles globaux
├── next.config.js       relais vers le backend, en-têtes de sécurité, images autorisées
├── vercel.json          déploiement
└── src/
    ├── pages/           une page par fichier ; pages/api : routes qui relaient le backend
    ├── components/      un dossier par partie du site : home, models, configurator, catalogue, samples,
    │                    realisations, avis, devis, checkout, ar, admin, shared, ui (composants de base)
    ├── hooks/           useHistory (annuler / rétablir), useCartCount (compteur du panier)…
    ├── lib/
    │   ├── apiClient.ts       appels au backend depuis le navigateur
    │   ├── backendServer.ts   appels au backend depuis le serveur Next
    │   ├── configurator/      arbre de zones, façades, limites de fabrication, correction automatique
    │   ├── ar/                export du meuble et ouverture de la réalité augmentée
    │   ├── cartCount.ts       compteur du panier (échantillons, boutique, façades)
    │   ├── pricing.ts         affichage de l'estimation de prix
    │   └── seo.ts             référencement
    └── proxy.ts         accès à l'administration par son chemin secret
```

## Branches et déploiement

- `dev` : branche principale du développement ; les fonctionnalités y arrivent par pull request.
- `main` : production (https://www.archimeuble.com), mise à jour depuis `dev` par pull request.
- Vercel déploie automatiquement `main` et `dev` (`vercel.json`).

## Tests

```bash
npm test                 # tous les tests (fichiers *.test.ts à côté du code testé)
npm run test:watch       # en continu pendant le développement
```

Vérifier que le frontend joint le backend :

```bash
# Le backend répond directement
curl http://localhost:8000/backend/api/models.php

# Le frontend relaie bien vers le backend
curl http://localhost:3000/api/models

# Un modèle 3D généré est accessible
curl -I http://localhost:3000/models/<fichier>.glb
```

## Dépannage

| Symptôme | Cause et remède |
|---|---|
| « Le backend a retourné une réponse inattendue », pas de modèles | Le backend répond par une erreur PHP, souvent des dépendances manquantes : `docker exec archimeuble-backend composer install` |
| « Erreur de connexion au backend » | Le backend n'est pas lancé : `docker compose up -d` dans `back/`, puis vérifier `NEXT_PUBLIC_API_URL` |
| Erreurs CORS dans la console | Le navigateur appelle le backend directement : vérifier `FRONTEND_URL` dans `back/docker-compose.yml` (`http://localhost:3000` en local) |
| Le modèle 3D généré ne s'affiche pas | Vérifier que le GLB existe dans `public/models/` (les deux dépôts doivent être côte à côte) et que l'adresse renvoyée par l'API est `/models/<fichier>.glb` ; voir la console du navigateur |
| `/admin` affiche une 404 | Normal : utiliser le chemin défini par `NEXT_PUBLIC_ADMIN_PATH` |
| Administration déconnectée en boucle | Le cookie de session du backend n'arrive pas : vérifier les cookies du domaine `localhost` et que le backend tourne |
| Erreur d'hydratation après beaucoup de modifications | Le serveur de développement sert une version périmée : recharger la page, sinon relancer `npm run dev` |
| La réalité augmentée ne s'ouvre pas sur Android en local | Scene Viewer exige le https : tester sur le site en ligne |
| Base locale sans catégories ni articles | Normal : elle ne contient pas les données de production ; les créer dans l'administration |
