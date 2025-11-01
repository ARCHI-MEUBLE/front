#!/bin/bash

# Installation des dépendances Calendly pour ArchiMeuble
# Ce script installe react-calendly et ses types TypeScript

echo "📦 Installation de react-calendly..."
npm install react-calendly

echo "📦 Installation des types TypeScript pour react-calendly..."
npm install --save-dev @types/react-calendly

echo "✅ Installation terminée !"
echo ""
echo "Prochaines étapes :"
echo "1. Configurer les variables d'environnement dans .env.local"
echo "2. Redémarrer le serveur de développement (npm run dev)"
