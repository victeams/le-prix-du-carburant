# Le prix du carburant 🚗⚡

Une application web moderne et responsive pour calculer et comparer le coût exact au 100 km en euros (€/100 km) pour tout type de véhicule (thermique et électrique).

## 🎯 Fonctionnalités

- **Calcul précis du coût au 100 km** :
  - Thermique : Consommation (L/100 km) × Prix au litre (€)
  - Électrique : [Consommation (kWh/100 km) × 1,12] × Prix du kWh (€)

- **Recherche intelligente des véhicules** :
  - Filtres en cascade : Marque > Modèle > Année > Version/Finitions
  - Champ d'immatriculation (format AB-123-CD) avec fallback manuel
  - Données ADEME complètes pour véhicules thermiques et électriques

- **Tarification électricité complète** :
  - EDF Tarif Bleu (Base, Heures Creuses)
  - EDF Tempo (Bleu, Blanc, Rouge)
  - Bornes AC publiques (0,35 €/kWh)
  - Bornes DC rapides autoroute (0,59 €/kWh)
  - Tarif personnalisé
  - Coefficient de perte de +12 % appliqué automatiquement

- **Prix du carburant en temps réel** :
  - Mise à jour automatique chaque jour à 6h00 via GitHub Actions
  - Données depuis l'API officielle du gouvernement français
  - Badge d'actualisation en temps réel
  - Fallback vers prix de référence en cas d'indisponibilité

- **Tableau comparatif dynamique** :
  - Gazole vs SP95-E10 vs SP98 vs GPL
  - Recharge électrique Domicile vs Autoroute
  - Mise à jour instantanée selon la sélection

- **Interface responsive** :
  - Design moderne et sobre
  - Compatible mobile, tablette, desktop
  - Champ "Ajuster ma consommation réelle (ordinateur de bord)"

## 📦 Structure du projet

```
.
├── index.html                    # Interface web principale
├── style.css                     # Styling responsive
├── app.js                        # Logique client (filtres, calculs, comparaison)
├── data/
│   ├── vehicles.json             # Base de véhicules thermiques et électriques
│   ├── electricity_rates.json    # Tarifs électricité (EDF, bornes publiques)
│   └── prices.json               # Prix carburants (mis à jour quotidiennement)
├── scripts/
│   └── fetch_fuel_prices.py      # Script Python pour récupérer les prix
└── .github/workflows/
    └── update_prices.yml         # Workflow GitHub Actions quotidien (6h00)
```

## 🚀 Déploiement GitHub Pages

### Configuration automatique

1. **Accès au dépôt** : https://github.com/victeams/le-prix-du-carburant

2. **Activation de GitHub Pages** :
   - Aller dans **Settings > Pages**
   - Sélectionner **"Deploy from a branch"**
   - Branche : **main**
   - Dossier : **/ (root)**
   - Cliquer sur **Save**

3. **Accès au site** :
   - URL : `https://victeams.github.io/le-prix-du-carburant/`
   - Attendre 1-2 minutes pour la première publication

### Troubleshooting 404

Si vous avez une erreur 404 :

1. **Vérifier que `index.html` est à la racine** (✓ c'est le cas)
2. **Vérifier la branche déployée** : Settings > Pages doit afficher "Deployed from main /"
3. **Vider le cache navigateur** : Ctrl+Maj+R (Windows) ou Cmd+Maj+R (Mac)
4. **Vérifier les Actions GitHub** : l'action de déploiement doit être verte (✓)

## 🔄 Mise à jour quotidienne des prix

### Workflow automatique

Le fichier `.github/workflows/update_prices.yml` exécute chaque jour à 6h00 UTC :

```bash
python scripts/fetch_fuel_prices.py
```

Le script :
- Interroge l'API `data.economie.gouv.fr`
- Récupère les prix réels (Gazole, SP95-E10, SP98, E85, GPL)
- Sauvegarde dans `data/prices.json` avec horodatage ISO 8601
- Commite automatiquement les modifications

### Déclenchement manuel

- Aller dans **Actions > Update fuel prices**
- Cliquer sur **Run workflow**
- Les prix sont mis à jour immédiatement

## 📊 Base de données des véhicules

### Thermiques

Modèles inclus (données ADEME) :
- **Renault Grand Scénic IV (2020)** 1.7 Blue dCi 120 ch — 5.2 L/100km
- Renault Clio V (2023) 1.0 TCe 100 ch — 4.8 L/100km
- Peugeot 308 (2023) 1.2 PureTech 130 ch — 5.1 L/100km
- Citroën C5 Aircross (2022) 1.5 Blue HDi 130 ch — 4.9 L/100km
- Toyota Yaris (2023) 1.5 Hybrid — 3.4 L/100km

### Électriques

Modèles inclus (consommations WLTP mixte) :
- Tesla Model 3 (2023) RWD 18" — 14.8 kWh/100km
- Renault Zoé (2023) Life 17" — 16.0 kWh/100km
- Volkswagen ID.3 (2023) Pro 18" — 15.5 kWh/100km
- Hyundai Kona Electric (2023) Standard 17" — 17.0 kWh/100km
- BMW i4 (2023) eDrive35 19" — 16.8 kWh/100km

## 💡 Utilisation

1. **Sélectionner le type de véhicule** : Thermique ou Électrique
2. **Saisir l'immatriculation** (optionnel) : Format AB-123-CD (recherche API avec fallback)
3. **Choisir la marque, modèle, année, version** via les filtres en cascade
4. **Ajuster la consommation réelle** si vous connaissez la valeur (ordinateur de bord)
5. **Sélectionner le carburant/tarif électricité**
6. **Voir le coût calculé au 100 km** et le tableau comparatif

## 🔧 Technologie

- **Frontend** : HTML5 + CSS3 + JavaScript Vanilla (pas de dépendance)
- **Backend/Data** : JSON statique + Python pour actualisations
- **CI/CD** : GitHub Actions (workflow quotidien)
- **Hosting** : GitHub Pages (statique)

## 📝 Format des données

### vehicles.json
```json
{
  "vehicles": {
    "thermal": [
      {
        "brand": "Renault",
        "model": "Grand Scénic IV",
        "year": 2020,
        "version": "1.7 Blue dCi 120 ch",
        "consumption": 5.2,
        "co2_emissions": 136
      }
    ],
    "electric": [
      {
        "brand": "Tesla",
        "model": "Model 3",
        "year": 2023,
        "version": "RWD 18\"",
        "battery_usable_kwh": 50,
        "consumption": 14.8,
        "heat_pump": true
      }
    ]
  }
}
```

### prices.json
```json
{
  "last_updated": "2026-10-10T06:00:00Z",
  "fuels": {
    "gazole": 1.489,
    "sp95_e10": 1.659,
    "sp98": 1.749,
    "e85": 0.769,
    "gpl": 0.849
  }
}
```

### electricity_rates.json
```json
{
  "rates": {
    "edf_blue_base": {
      "label": "EDF Tarif Bleu - Base",
      "price_per_kwh": 0.2167
    },
    "public_dc": {
      "label": "Borne DC rapide autoroute",
      "price_per_kwh": 0.59
    }
  },
  "loss_coefficient": 1.12
}
```

## 📱 Responsive Design

- **Desktop** : Grille 3 colonnes
- **Tablette** : Grille 2 colonnes (< 1024px)
- **Mobile** : Grille 1 colonne (< 820px)

## 🛠️ Développement local

### Prérequis
- Python 3.11+ (pour tester le script de mise à jour)
- Navigateur moderne (Chrome, Firefox, Safari, Edge)

### Installation

```bash
git clone https://github.com/victeams/le-prix-du-carburant.git
cd le-prix-du-carburant
```

### Serveur local

```bash
# Python 3.10+
python -m http.server 8000

# Accès : http://localhost:8000
```

### Tester le script de mise à jour

```bash
python scripts/fetch_fuel_prices.py
```

## 📄 Licence

Public Domain — Utilisation libre à titre personnel ou commercial.

## 🤝 Contribution

Les améliorations sont bienvenues :
- Ajouter des véhicules
- Améliorer l'interface
- Optimiser le script de récupération des prix
- Intégrer une vraie API de plaque d'immatriculation

## 📧 Support

Pour toute question ou signalement de bug, ouvrir une issue sur GitHub.

---

**Dernière mise à jour** : 10 octobre 2026  
**URL de production** : https://victeams.github.io/le-prix-du-carburant/

## Photo de plaque (mobile)

- Le champ « Plaque d'immatriculation » ouvre l'appareil photo arrière (`capture="environment"`), compatible Safari iOS et Chrome Android ; aucune permission `getUserMedia` supplémentaire n'est requise, seulement HTTPS (`https://victeams.github.io/le-prix-du-carburant/`).
- L'OCR (Tesseract.js) lit la plaque au format `AB-123-CD` ; si elle est déjà associée à un véhicule (stocké localement), celui-ci est sélectionné et le coût recalculé. Sinon, choisis le véhicule puis clique sur « Associer ».
- La publication se fait depuis `main` : fusionner la PR pour mettre le site à jour. Des balises meta anti-cache sont ajoutées.
