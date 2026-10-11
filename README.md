# Le prix du carburant 🚗⚡

Application web statique, en français, pour estimer et comparer le coût au 100 km de véhicules thermiques et électriques. Les calculs utilisent les fichiers JSON du dépôt ; aucun prix de carburant fictif n'est utilisé comme prix actuel.

## Utilisation

1. Sélectionnez **Thermique** ou **Électrique**, puis le véhicule dans les filtres marque, modèle, année et version.
2. Pour un véhicule thermique, choisissez le carburant. Pour un véhicule électrique, choisissez un tarif de recharge.
3. Vous pouvez remplacer la consommation constructeur par votre consommation mesurée.
4. Le coût apparaît avec un comparatif adapté au type de véhicule. Une donnée de prix absente est affichée comme indisponible, jamais remplacée par un prix inventé.

Les consommations véhicules sont des valeurs WLTP indicatives. Le coût électrique applique le coefficient de pertes enregistré dans les tarifs (12 % par défaut ; 8 % pour les bornes DC rapides lorsqu'indiqué).

## Lancer localement

Les navigateurs ne chargent généralement pas les fichiers JSON avec `file://`. Depuis la racine du dépôt, lancez un serveur HTTP :

```bash
python3 -m http.server 8000
```

Ouvrez ensuite <http://localhost:8000>.

## Données et prix carburants

- `data/vehicles.json` contient les véhicules et consommations WLTP.
- `data/electricity_rates.json` contient des tarifs de référence indicatifs. Ils ne sont pas actualisés automatiquement ; vérifiez votre contrat et les tarifs des opérateurs avant de les utiliser.
- `data/prices.json` contient le dernier jeu complet de prix obtenu et validé. Au départ, les prix et leur date sont volontairement vides : le site ne prétend donc pas qu'ils sont à jour.

Le script `scripts/fetch_fuel_prices.py` télécharge l'export JSON complet du jeu de données public français `prix-des-carburants-en-france-flux-instantane-v2` sur data.economie.gouv.fr. Il calcule les prix médians des observations trouvées pour le gazole, le SP95-E10, le SP98, l'E85 et le GPL. Il n'enregistre le nouveau fichier que si les cinq carburants ont des prix plausibles et une date de mise à jour source vérifiable. En cas d'erreur, il échoue sans remplacer les données existantes.

L'actualisation automatisée est définie dans `.github/workflows/update_prices.yml` :

- planifiée deux fois par semaine (lundi et jeudi) à 06:00 UTC ;
- déclenchable manuellement dans **Actions > Update fuel prices > Run workflow** ;
- validation par le script avant toute modification ;
- commit uniquement si les données validées ont changé.

Pour autoriser le commit automatisé, le dépôt doit accepter les écritures du `GITHUB_TOKEN` (Settings > Actions > General > Workflow permissions : **Read and write permissions**). Si l'API, son schéma ou les données requises ne sont pas disponibles, le workflow échoue et conserve les prix précédents. Vérifiez le journal de l'exécution dans l'onglet **Actions**.

Pour lancer le même script manuellement :

```bash
python3 scripts/fetch_fuel_prices.py
```

Cette commande nécessite un accès réseau. Une réussite signifie que des données datées ont été récupérées ; cela ne garantit pas que chaque tarif local soit représentatif de votre station.

## Plaque d'immatriculation (format SIV)

Le formulaire **Tester une plaque française** vérifie localement le format `AA-123-AA` (lettres I, O et U exclues). Il n'identifie pas le véhicule : aucune recherche externe n'est faite. Une recherche future devra être isolée derrière une fonction dédiée, avec fournisseur, coûts et confidentialité documentés.

### Scan, historique et coût (depuis un téléphone)

Lancez `node server.js` sur un PC du même réseau Wi‑Fi, puis ouvrez `http://<IP-du-PC>:3000` sur le téléphone. Le bouton **📷 Scanner une plaque** ouvre l'appareil photo ; la lecture (OCR Tesseract.js, chargé depuis jsDelivr, connexion requise) se fait sur l'appareil, l'image n'est pas envoyée. Sans HTTPS, certains navigateurs mobiles refusent la caméra directe mais proposent la galerie.

- **Historique du véhicule** : non disponible sans fournisseur agréé (HistoVec exige le consentement du propriétaire, les API tierces sont payantes et avec clé). Brancher le fournisseur dans `lookupVehicleByPlate` (`vehicle-lookup.js`) ; il doit renvoyer `{ id, brand, model, year, fuel_type, consumption, history }`. Tant qu'il renvoie `null`, rien n'est inventé.
- **Coût aux 100 km** : consommation WLTP × prix du carburant de `data/prices.json`. Routes : `GET /plaque/:plaque`, `GET /vehicules`, `GET /vehicules/:id/cout`.
- **Prix du carburant** : actualisés 2 fois par semaine (lundi et jeudi, 06:00 UTC) par le workflow `update_prices.yml`, à partir des données officielles data.economie.gouv.fr.

Tests : `node --test tests/plate.test.js tests/server.test.js tests/cost.test.js`

### API HTTP (sans clé ni dépendance)

```bash
node server.js            # port 3000 par défaut, ou PORT=8080 node server.js
curl http://localhost:3000/plaque/ab-123-cd   # {"valid":true,"plate":"AB-123-CD"}
curl http://localhost:3000/plaque/AB-12-CD    # {"valid":false,"plate":"AB-12-CD"}
```

Tests : `node --test tests/`

## Vérifications et déploiement

Le projet n'a pas de dépendances front-end ni de système de build. Les pages GitHub Pages peuvent servir les fichiers statiques directement depuis la racine du dépôt. Après activation de GitHub Pages dans **Settings > Pages**, choisissez la branche de déploiement et le dossier `/`.

Vérifications locales disponibles :

```bash
python3 -m json.tool data/vehicles.json > /dev/null
python3 -m json.tool data/prices.json > /dev/null
python3 -m json.tool data/electricity_rates.json > /dev/null
python3 -m py_compile scripts/fetch_fuel_prices.py
```

La récupération réelle des prix doit être vérifiée avec une exécution manuelle du script ou du workflow, puisque l'accès réseau à la source est nécessaire.
