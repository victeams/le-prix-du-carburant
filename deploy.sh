#!/bin/bash

# Script de déploiement local pour tester l'automatisation
# Usage: bash deploy.sh

set -e

echo "=================================================="
echo "🚗 ⚡ Le prix du carburant - Script de déploiement"
echo "=================================================="
echo ""

# Vérifier si Python est installé
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé"
    exit 1
fi

echo "✓ Python 3 trouvé"
echo ""

# Récupérer les prix
echo "🔄 Récupération des prix carburants..."
python3 scripts/fetch_fuel_prices.py

echo ""
echo "✓ Vérification du fichier prices.json..."
if [ -f "data/prices.json" ]; then
    echo "✅ Fichier prices.json créé avec succès"
    echo ""
    echo "📊 Contenu du fichier:"
    cat data/prices.json | python3 -m json.tool
else
    echo "❌ Erreur: Le fichier prices.json n'a pas été créé"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Déploiement terminé avec succès!"
echo "=================================================="
echo ""
echo "📝 Prochaines étapes:"
echo "1. Ouvre le site: https://victeams.github.io/le-prix-du-carburant/"
echo "2. Fais un hard refresh: Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac)"
echo "3. Les prix seront automatiquement mis à jour toutes les 5 heures"
echo ""
