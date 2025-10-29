# Guide de Contribution - ArchiMeuble Frontend

## 🌳 Structure des branches

- **`main`** : Production (déployé sur Vercel)
- **`dev`** : Développement (tests et validation)
- **`feature/*`** : Nouvelles fonctionnalités
- **`fix/*`** : Corrections de bugs
- **`hotfix/*`** : Corrections urgentes pour production

## 🔄 Workflow Git

### 1. Créer une nouvelle fonctionnalité

```bash
# Partir de dev (toujours à jour)
git checkout dev
git pull origin dev

# Créer votre branche
git checkout -b feature/nom-de-votre-feature

# Faire vos modifications
git add .
git commit -m "Description de vos changements"

# Pousser votre branche
git push origin feature/nom-de-votre-feature
```

### 2. Créer une Pull Request

1. Allez sur GitHub : https://github.com/ARCHI-MEUBLE/front
2. Cliquez sur **Pull requests** → **New pull request**
3. Base: `dev` ← Compare: `feature/nom-de-votre-feature`
4. Remplissez la description :
   - Qu'avez-vous fait ?
   - Pourquoi ?
   - Comment tester ?
   - Screenshots si UI
5. Cliquez sur **Create Pull Request**

### 3. Attendre la validation

- ✅ Les **tests CI/CD** doivent passer (automatique)
- ✅ Au moins **1 approbation** d'un membre de l'équipe
- ✅ Résoudre les **conversations** si il y en a

### 4. Merger

Une fois validé, cliquez sur **Merge pull request**

## 🧪 Tests CI/CD

Les tests suivants s'exécutent automatiquement :

- ✅ ESLint (qualité du code)
- ✅ TypeScript type checking
- ✅ Build Next.js réussit
- ✅ Build output valide
- ✅ npm audit (vulnérabilités)
- ✅ Pas de fichiers sensibles
- ✅ Tests unitaires (si configurés)
- ✅ Configuration Vercel

**Si un test échoue** : corrigez le problème et poussez un nouveau commit. Les tests se relanceront automatiquement.

## 📋 Conventions de commit

```
feat: Ajouter nouvelle fonctionnalité
fix: Corriger un bug
refactor: Refactoriser du code
docs: Modifier la documentation
style: Formater le code (pas de changement logique)
test: Ajouter ou modifier des tests
chore: Tâches diverses (dépendances, config, etc.)
ui: Modifier l'interface utilisateur
```

Exemples :
```bash
git commit -m "feat: ajouter page liste des clients"
git commit -m "fix: corriger affichage image modèle"
git commit -m "ui: améliorer design dashboard admin"
git commit -m "refactor: simplifier ModelCard component"
```

## 🚫 Règles importantes

1. **JAMAIS de push direct sur `dev` ou `main`** - toujours passer par une PR
2. **JAMAIS commit de fichiers sensibles** (.env.local, API keys)
3. **Toujours tester localement** :
   ```bash
   npm run dev      # Tester en développement
   npm run build    # Vérifier que le build passe
   npm run lint     # Vérifier le linting
   ```
4. **Commenter les composants complexes**
5. **Reviewer les PRs des autres** pour apprendre et aider

## 🛠 Commandes utiles

```bash
# Installer les dépendances
npm install

# Lancer en dev
npm run dev

# Build
npm run build

# Linter
npm run lint

# Linter + fix automatique
npm run lint:fix

# Type check TypeScript
npx tsc --noEmit
```

## 🎨 Style de code

- Utilisez **TypeScript** pour tout nouveau code
- Suivez les conventions **ESLint** du projet
- Utilisez des **noms descriptifs** pour variables et fonctions
- Préférez les **composants fonctionnels** avec hooks

## 🆘 Besoin d'aide ?

- Créez une issue sur GitHub
- Demandez sur le canal de l'équipe
- Consultez la documentation Next.js : https://nextjs.org/docs

## 🎯 Merge vers main

Seuls les admins du projet peuvent merger `dev` → `main`.

Le processus :
1. Tous les tests passent sur `dev`
2. Fonctionnalités testées manuellement
3. UI validée sur preview Vercel
4. PR `dev` → `main`
5. Approbation de 2 personnes minimum
6. Merge et déploiement automatique sur Vercel
