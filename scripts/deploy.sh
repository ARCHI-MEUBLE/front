#!/bin/bash

# Script de déploiement ArchiMeuble Frontend
# Usage: ./scripts/deploy.sh [staging|production]

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier les arguments
if [ $# -eq 0 ]; then
    log_error "Usage: ./scripts/deploy.sh [staging|production]"
    exit 1
fi

ENVIRONMENT=$1

# Valider l'environnement
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    log_error "Environment must be 'staging' or 'production'"
    exit 1
fi

log_info "🚀 Starting deployment to $ENVIRONMENT..."

# Vérifier que nous sommes sur la bonne branche
CURRENT_BRANCH=$(git branch --show-current)

if [ "$ENVIRONMENT" == "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    log_warn "You are on branch '$CURRENT_BRANCH' but deploying to production (main branch expected)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi
fi

if [ "$ENVIRONMENT" == "staging" ] && [ "$CURRENT_BRANCH" != "staging" ] && [ "$CURRENT_BRANCH" != "develop" ]; then
    log_warn "You are on branch '$CURRENT_BRANCH' but deploying to staging (staging/develop branch expected)"
fi

# Vérifier qu'il n'y a pas de modifications non commitées
if [[ -n $(git status -s) ]]; then
    log_error "You have uncommitted changes. Please commit or stash them first."
    git status -s
    exit 1
fi

# Pull les dernières modifications
log_info "📥 Pulling latest changes..."
git pull origin $CURRENT_BRANCH

# Installer les dépendances
log_info "📦 Installing dependencies..."
npm ci

# Lancer les tests (si disponibles)
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    log_info "🧪 Running tests..."
    npm test || {
        log_error "Tests failed. Deployment aborted."
        exit 1
    }
fi

# Build le projet
log_info "🔨 Building project..."
npm run build || {
    log_error "Build failed. Deployment aborted."
    exit 1
}

# Vérifier que Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    log_info "📥 Installing Vercel CLI..."
    npm install -g vercel
fi

# Déployer sur Vercel
log_info "🚀 Deploying to Vercel ($ENVIRONMENT)..."

if [ "$ENVIRONMENT" == "production" ]; then
    # Déploiement en production
    vercel --prod || {
        log_error "Deployment failed"
        exit 1
    }
else
    # Déploiement en staging (preview)
    vercel || {
        log_error "Deployment failed"
        exit 1
    }
fi

log_info "✅ Deployment completed successfully!"
log_info "🔗 Check your Vercel dashboard for the deployment URL"

# Créer un tag git pour la production
if [ "$ENVIRONMENT" == "production" ]; then
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    TAG="release-$TIMESTAMP"

    log_info "🏷️  Creating git tag: $TAG"
    git tag -a $TAG -m "Production release $TIMESTAMP"
    git push origin $TAG

    log_info "✅ Git tag created and pushed"
fi

log_info "🎉 All done!"
