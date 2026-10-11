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

Le script `scripts/fetch_fuel_prices.py` interroge le jeu de données public français `prix-des-carburants-en-france-flux-instantane-v2` sur data.economie.gouv.fr. Il calcule les prix médians des observations trouvées pour le gazole, le SP95-E10, le SP98, l'E85 et le GPL. Il n'enregistre le nouveau fichier que si les cinq carburants ont des prix plausibles et une date de mise à jour source vérifiable. En cas d'erreur, il échoue sans remplacer les données existantes.

L'actualisation automatisée est définie dans `.github/workflows/update_prices.yml` :

- planifiée chaque jour à 06:00 UTC ;
- déclenchable manuellement dans **Actions > Update fuel prices > Run workflow** ;
- validation par le script avant toute modification ;
- commit uniquement si les données validées ont changé.

Pour autoriser le commit automatisé, le dépôt doit accepter les écritures du `GITHUB_TOKEN` (Settings > Actions > General > Workflow permissions : **Read and write permissions**). Si l'API, son schéma ou les données requises ne sont pas disponibles, le workflow échoue et conserve les prix précédents. Vérifiez le journal de l'exécution dans l'onglet **Actions**.

Pour lancer le même script manuellement :

```bash
python3 scripts/fetch_fuel_prices.py
```

Cette commande nécessite un accès réseau. Une réussite signifie que des données datées ont été récupérées ; cela ne garantit pas que chaque tarif local soit représentatif de votre station.

## Reconnaissance de plaque

Aucune reconnaissance de plaque n'est intégrée : le dépôt ne configure pas de fournisseur d'API, de clé ou de service dont le fonctionnement et les coûts puissent être vérifiés. La plaque ne permet donc pas d'identifier un véhicule dans cette application. Sélectionnez-le manuellement. Une intégration future nécessite de choisir et documenter un service externe, ses coûts, sa politique de confidentialité et sa configuration.

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
