# ☁️ DÉPLOIEMENT FRONTEND NEXT.JS - GUIDE SIMPLE

> **IMPORTANT** : Le FRONTEND Next.js se déploie sur **VERCEL** (PAS Railway !)

---

## 🎯 RÉSULTAT FINAL

Après ce guide, vous aurez votre frontend accessible à cette URL :
```
https://archimeuble-dev-xxx.vercel.app
```

Cette interface web communiquera avec votre backend Railway.

---

## ⚙️ CE QUE FAIT VERCEL

Vercel héberge votre frontend Next.js avec :
- ✅ Interface utilisateur (configurateur 3D)
- ✅ Pages d'administration
- ✅ Authentification
- ✅ Connexion à l'API backend

---

## 📋 PRÉREQUIS

- Un compte GitHub (vous l'avez déjà)
- Le repository `ARCHI-MEUBLE/front` sur GitHub (vous l'avez déjà)
- **L'URL de votre backend Railway** (obtenue après avoir suivi le guide dans `back/DEPLOIEMENT_SIMPLE.md`)

⚠️ **IMPORTANT** : Déployez d'abord le BACKEND sur Railway avant de faire ce guide !

---

## 🚀 ÉTAPES DE DÉPLOIEMENT

### **ÉTAPE 1 : Créer un compte Vercel (1 minute)**

1. Allez sur **https://vercel.com**
2. Cliquez sur **"Sign Up"** (ou "Login" si vous avez déjà un compte)
3. Choisissez **"Continue with GitHub"**
4. Autorisez Vercel à accéder à vos repositories GitHub
5. Vous êtes maintenant sur le dashboard Vercel

---

### **ÉTAPE 2 : Créer le projet Frontend DEV (2 minutes)**

1. Sur le dashboard Vercel, cliquez sur **"Add New..."** → **"Project"**
2. Vous voyez la liste de vos repositories GitHub
3. Trouvez **`ARCHI-MEUBLE/front`** ⚠️ (PAS back !)
4. Cliquez sur **"Import"** à côté de ce repository

---

### **ÉTAPE 3 : Configurer le projet (3 minutes)**

Vous êtes sur la page de configuration. Remplissez comme ceci :

#### **Configuration générale** :
```
Project Name: archimeuble-frontend
Framework Preset: Next.js (détecté automatiquement)
Root Directory: ./ (laisser par défaut)
Build Command: npm run build (laisser par défaut)
Output Directory: .next (laisser par défaut)
Install Command: npm install (laisser par défaut)
```

#### **⚠️ NE DÉPLOYEZ PAS ENCORE !** Descendez pour ajouter les variables d'environnement.

---

### **ÉTAPE 4 : Ajouter les variables d'environnement (2 minutes)**

1. Descendez jusqu'à la section **"Environment Variables"**
2. Vous verrez 3 onglets : **Production**, **Preview**, **Development**
3. Cliquez sur l'onglet **"Preview"** (pour l'environnement de test)

#### **Ajoutez ces 3 variables** :

**Variable 1** :
```
Name: NEXT_PUBLIC_API_URL
Value: https://[VOTRE-URL-RAILWAY]
Environment: Preview (cochez)
```

**Variable 2** :
```
Name: SESSION_SECRET
Value: archimeuble_secret_dev_2025
Environment: Preview (cochez)
```

**Variable 3** :
```
Name: NODE_ENV
Value: development
Environment: Preview (cochez)
```

⚠️ **ATTENTION** : Remplacez `[VOTRE-URL-RAILWAY]` par l'URL que vous avez copiée lors du déploiement Railway.

**Exemple** :
```
NEXT_PUBLIC_API_URL=https://archimeuble-backend-dev.up.railway.app
```

**SANS** `http://` au début et **SANS** `/` à la fin !

---

### **ÉTAPE 5 : Déployer ! (1 clic)**

1. Tout en bas de la page, cliquez sur **"Deploy"**
2. Vercel commence à construire votre application
3. Attendez 2-5 minutes (vous verrez les logs défiler)

**Logs normaux à voir** :
```
Installing dependencies...
Building application...
Linting and checking validity...
Creating optimized production build...
Build completed successfully
```

---

### **ÉTAPE 6 : Configurer la branche DEV (1 minute)**

Une fois le premier déploiement terminé :

1. Cliquez sur **"Continue to Dashboard"**
2. Allez dans **"Settings"** (en haut)
3. Dans le menu de gauche, cliquez sur **"Git"**
4. Trouvez la section **"Production Branch"**
5. Changez de `main` à **`dev`**
6. Cliquez sur **"Save"**

---

### **ÉTAPE 7 : Redéployer sur la branche DEV (1 minute)**

1. Retournez à l'onglet **"Deployments"**
2. Cliquez sur **"Redeploy"** (en haut à droite)
3. Sélectionnez la branche **`dev`**
4. Cliquez sur **"Redeploy"**
5. Attendez 2-3 minutes

---

### **ÉTAPE 8 : Tester que ça fonctionne (2 minutes)**

1. Une fois le déploiement terminé, cliquez sur **"Visit"** (en haut à droite)
2. Votre site s'ouvre dans un nouvel onglet !

**Tests à faire** :

✅ **Test 1 - Page d'accueil** :
- La page d'accueil s'affiche
- Les images et le design sont corrects

✅ **Test 2 - Catalogue** :
- Cliquez sur "Acheter" ou allez sur `/catalogue`
- Vous devez voir les 3 modèles de meubles avec leurs images

✅ **Test 3 - Admin** :
- Allez sur `/admin`
- Connectez-vous avec :
  - **Username** : `admin`
  - **Password** : `admin123`
- Le dashboard admin s'affiche

✅ **Test 4 - Configurateur 3D** :
- Cliquez sur un meuble dans le catalogue
- Le configurateur 3D se charge
- Vous pouvez modifier les dimensions, modules, etc.

---

## 🎉 TERMINÉ !

Votre frontend Next.js est maintenant déployé sur Vercel !

**Votre URL de test** :
```
https://archimeuble-[hash].vercel.app
```

(Vous pouvez trouver l'URL exacte dans le dashboard Vercel)

---

## 🔄 POUR PLUS TARD : Déployer en PRODUCTION

Quand vous serez prêt à déployer en production :

1. Dans Vercel, allez dans **Settings** → **Git**
2. Changez la **Production Branch** de `dev` à **`main`**
3. Dans **Settings** → **Environment Variables**
4. Ajoutez les mêmes variables mais pour l'onglet **"Production"** :
   ```
   NEXT_PUBLIC_API_URL=https://archimeuble-backend-production.up.railway.app
   SESSION_SECRET=<générer_un_nouveau_secret_différent>
   NODE_ENV=production
   ```
5. Faites un push sur la branche `main`

---

## 📞 BESOIN D'AIDE ?

**Erreurs courantes** :

1. **"Build Failed"** → Vérifiez que vous avez bien sélectionné le repository `front` (pas `back`)
2. **"Can't find pages directory"** → Vous avez importé le mauvais repository (back au lieu de front)
3. **"API Error / Network Error"** → Vérifiez que `NEXT_PUBLIC_API_URL` pointe bien vers votre backend Railway
4. **Catalogue vide** → Vérifiez que votre backend Railway fonctionne (testez l'URL `/api/models`)

---

## 🔗 ARCHITECTURE COMPLÈTE

```
┌─────────────────────────────────────────┐
│         UTILISATEUR                      │
│         (Navigateur)                     │
└────────────────┬────────────────────────┘
                 │
                 │ Visite le site
                 ▼
┌─────────────────────────────────────────┐
│         VERCEL (Frontend)                │
│   https://archimeuble-dev.vercel.app    │
│                                          │
│  • Pages HTML/CSS/JS                    │
│  • Configurateur 3D                     │
│  • Interface admin                      │
└────────────────┬────────────────────────┘
                 │
                 │ Appels API
                 ▼
┌─────────────────────────────────────────┐
│      RAILWAY (Backend PHP)               │
│  https://archimeuble-backend-dev...     │
│                                          │
│  • API REST                             │
│  • Base de données SQLite               │
│  • Génération 3D (Python)               │
└─────────────────────────────────────────┘
```

---

**Dernière mise à jour** : Octobre 2025
