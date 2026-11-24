#!/bin/bash

# =============================================================================
# Script de déploiement automatisé pour Vercel - ArchiMeuble Frontend
# =============================================================================
# Ce script déploie la branche server_test du frontend sur Vercel
#
# Prérequis:
#   - Vercel CLI installé: npm install -g vercel
#   - Authentification Vercel: vercel login
#   - Projet Vercel déjà créé et lié
#
# Usage:
#   ./deploy-vercel.sh
# =============================================================================

set -e  # Arrêter le script en cas d'erreur

echo "▲ =========================================="
echo "▲ ArchiMeuble - Déploiement Vercel"
echo "▲ Environnement: SERVER TEST"
echo "▲ =========================================="
echo ""

# Vérifier que Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Erreur: Vercel CLI n'est pas installé"
    echo "📦 Installation: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI détecté"
echo ""

# Vérifier qu'on est bien dans le dossier front
if [ ! -f "vercel.json" ]; then
    echo "❌ Erreur: Fichier vercel.json introuvable"
    echo "📁 Assurez-vous d'être dans le dossier front/"
    exit 1
fi

echo "✅ Configuration Vercel détectée"
echo ""

# Afficher la branche actuelle
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Branche actuelle: $CURRENT_BRANCH"
echo ""

# Vérifier si on est sur la branche server_test
if [ "$CURRENT_BRANCH" != "server_test" ]; then
    echo "⚠️  Vous n'êtes pas sur la branche server_test"
    read -p "Voulez-vous basculer sur server_test? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Basculement sur server_test..."
        git fetch origin
        git checkout server_test
        git pull origin server_test
        echo "✅ Branche server_test activée"
    else
        echo "❌ Déploiement annulé"
        exit 1
    fi
fi

echo ""
echo "🔍 Vérification des fichiers modifiés..."
git status --short

echo ""
read -p "📤 Voulez-vous pousser les modifications locales avant le déploiement? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Push vers GitHub..."
    git push origin server_test
    echo "✅ Code poussé sur GitHub"
fi

echo ""
echo "🔧 Configuration de l'environnement de test..."
echo ""

# Demander l'URL du backend Railway
echo "⚠️  IMPORTANT: Configurez l'URL du backend Railway"
echo ""
read -p "Entrez l'URL du backend Railway (ex: https://archimeuble-back-test.up.railway.app): " RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ URL du backend requise"
    exit 1
fi

echo ""
echo "🚀 Démarrage du déploiement sur Vercel..."
echo "   Environnement: Preview (server_test)"
echo "   Backend URL: $RAILWAY_URL"
echo ""

# Déployer sur Vercel en mode preview
# L'option --yes accepte automatiquement les prompts
# L'environnement 'preview' sera utilisé pour la branche server_test
vercel --yes

echo ""
echo "✅ Déploiement terminé avec succès!"
echo ""
echo "📊 Pour voir les déploiements:"
echo "   vercel ls"
echo ""
echo "🌐 Pour ouvrir le projet dans Vercel:"
echo "   vercel --prod"
echo ""
echo "🔧 Pour configurer les variables d'environnement:"
echo "   1. Allez sur https://vercel.com"
echo "   2. Sélectionnez votre projet"
echo "   3. Settings > Environment Variables"
echo "   4. Ajoutez les variables depuis .env.server_test"
echo "   5. Sélectionnez 'Preview' pour l'environnement server_test"
echo ""
echo "⚠️  Variables importantes à configurer:"
echo "   - NEXT_PUBLIC_API_URL=$RAILWAY_URL"
echo "   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..."
echo "   - FRONT_PROXY_SECRET=... (même valeur que dans le backend Railway)"
echo "   - ADMIN_PATH=... (chemin secret de l'admin)"
echo ""
echo "🎉 Déploiement terminé!"
